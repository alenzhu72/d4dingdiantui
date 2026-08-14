require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"];
if (require.main === module) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`缺少环境变量: ${missing.join(", ")}`);
  if (process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET 至少需要 32 个字符");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const app = express();
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true }));

const safeUser = (row) => ({ id: Number(row.id), email: row.email, displayName: row.display_name, role: row.role, status: row.status });
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const slugify = (title) => `${clean(title, 100).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomBytes(3).toString("hex")}`;
const cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE === "true", maxAge: 7 * 86400000, path: "/" };

function issueToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d", issuer: "d4-midian" });
}
async function identify(req, _res, next) {
  try {
    const token = req.cookies.d4_session;
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: "d4-midian" });
    const [rows] = await pool.execute("SELECT id,email,display_name,role,status FROM users WHERE id=? LIMIT 1", [payload.sub]);
    if (rows[0] && rows[0].status === "active") req.user = safeUser(rows[0]);
  } catch (_) {}
  next();
}
const requireUser = (req, res, next) => req.user ? next() : res.status(401).json({ error: "请先登录" });
const requireAdmin = (req, res, next) => req.user?.role === "admin" ? next() : res.status(403).json({ error: "需要管理员权限" });
app.use(identify);

app.post("/api/auth/register", async (req, res) => {
  const email = clean(req.body.email, 190).toLowerCase();
  const displayName = clean(req.body.displayName, 60);
  const password = String(req.body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "邮箱格式不正确" });
  if (displayName.length < 2) return res.status(400).json({ error: "昵称至少需要 2 个字符" });
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: "密码需要 8–72 个字符" });
  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute("INSERT INTO users(email,password_hash,display_name) VALUES(?,?,?)", [email, hash, displayName]);
    const user = { id: Number(result.insertId), email, displayName, role: "user", status: "active" };
    res.cookie("d4_session", issueToken(user), cookieOptions).status(201).json({ user });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "该邮箱已注册" });
    throw error;
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = clean(req.body.email, 190).toLowerCase();
  const [rows] = await pool.execute("SELECT id,email,password_hash,display_name,role,status FROM users WHERE email=? LIMIT 1", [email]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(String(req.body.password || ""), row.password_hash))) return res.status(401).json({ error: "邮箱或密码错误" });
  if (row.status !== "active") return res.status(403).json({ error: "账号已被管理员停用" });
  const user = safeUser(row);
  res.cookie("d4_session", issueToken(user), cookieOptions).json({ user });
});
app.post("/api/auth/logout", (_req, res) => res.clearCookie("d4_session", { path: "/" }).json({ ok: true }));
app.get("/api/auth/me", (req, res) => res.json({ user: req.user || null }));

app.get("/api/builds", async (req, res) => {
  const mine = req.query.mine === "1" && req.user;
  const sql = mine
    ? "SELECT b.id,b.title,b.slug,b.class_name,b.season,b.summary,b.visibility,b.view_count,b.updated_at,u.display_name author FROM builds b JOIN users u ON u.id=b.user_id WHERE b.user_id=? ORDER BY b.updated_at DESC LIMIT 100"
    : "SELECT b.id,b.title,b.slug,b.class_name,b.season,b.summary,b.visibility,b.view_count,b.updated_at,u.display_name author FROM builds b JOIN users u ON u.id=b.user_id WHERE b.visibility='public' ORDER BY b.updated_at DESC LIMIT 100";
  const [rows] = await pool.execute(sql, mine ? [req.user.id] : []);
  res.json({ builds: rows });
});
app.get("/api/builds/:id", async (req, res) => {
  const [rows] = await pool.execute("SELECT b.*,u.display_name author FROM builds b JOIN users u ON u.id=b.user_id WHERE b.id=? LIMIT 1", [req.params.id]);
  const row = rows[0];
  if (!row || (row.visibility !== "public" && req.user?.id !== Number(row.user_id) && req.user?.role !== "admin")) return res.status(404).json({ error: "Build 不存在" });
  await pool.execute("UPDATE builds SET view_count=view_count+1 WHERE id=?", [row.id]);
  row.build_data = JSON.parse(row.build_data || "{}");
  res.json({ build: row });
});
app.post("/api/builds", requireUser, async (req, res) => {
  const title = clean(req.body.title, 120), className = clean(req.body.className, 30);
  if (!title || !className) return res.status(400).json({ error: "请填写标题和职业" });
  const data = JSON.stringify(req.body.buildData || {});
  if (Buffer.byteLength(data) > 1500000) return res.status(413).json({ error: "Build 数据过大" });
  const [result] = await pool.execute("INSERT INTO builds(user_id,title,slug,class_name,season,summary,visibility,build_data) VALUES(?,?,?,?,?,?,?,?)", [req.user.id,title,slugify(title),className,clean(req.body.season,30)||"赛季 9",clean(req.body.summary,500),req.body.visibility === "public" ? "public" : "draft",data]);
  res.status(201).json({ id: Number(result.insertId) });
});
app.put("/api/builds/:id", requireUser, async (req, res) => {
  const [rows] = await pool.execute("SELECT user_id FROM builds WHERE id=?", [req.params.id]);
  if (!rows[0] || (Number(rows[0].user_id) !== req.user.id && req.user.role !== "admin")) return res.status(403).json({ error: "无权修改" });
  const data = JSON.stringify(req.body.buildData || {});
  await pool.execute("UPDATE builds SET title=?,class_name=?,season=?,summary=?,visibility=?,build_data=? WHERE id=?", [clean(req.body.title,120),clean(req.body.className,30),clean(req.body.season,30),clean(req.body.summary,500),req.body.visibility === "public" ? "public" : "draft",data,req.params.id]);
  res.json({ ok: true });
});

app.get("/api/builds/:id/comments", async (req, res) => {
  const [rows] = await pool.execute("SELECT c.id,c.parent_id,c.body,c.created_at,u.display_name author FROM comments c JOIN users u ON u.id=c.user_id WHERE c.build_id=? AND c.status='visible' ORDER BY c.created_at ASC LIMIT 300", [req.params.id]);
  res.json({ comments: rows });
});
app.post("/api/builds/:id/comments", requireUser, async (req, res) => {
  const body = clean(req.body.body, 1200);
  if (body.length < 2) return res.status(400).json({ error: "留言内容太短" });
  const parentId = req.body.parentId ? Number(req.body.parentId) : null;
  if (parentId) {
    const [parents] = await pool.execute("SELECT id FROM comments WHERE id=? AND build_id=?", [parentId, req.params.id]);
    if (!parents[0]) return res.status(400).json({ error: "回复目标不存在" });
  }
  const [result] = await pool.execute("INSERT INTO comments(build_id,user_id,parent_id,body) VALUES(?,?,?,?)", [req.params.id,req.user.id,parentId,body]);
  res.status(201).json({ id: Number(result.insertId) });
});

app.get("/api/admin/users", requireUser, requireAdmin, async (_req, res) => {
  const [rows] = await pool.execute("SELECT id,email,display_name,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 500");
  res.json({ users: rows });
});
app.patch("/api/admin/users/:id", requireUser, requireAdmin, async (req, res) => {
  const status = req.body.status === "suspended" ? "suspended" : "active";
  if (Number(req.params.id) === req.user.id && status === "suspended") return res.status(400).json({ error: "不能停用自己的账号" });
  await pool.execute("UPDATE users SET status=? WHERE id=?", [status, req.params.id]);
  await pool.execute("INSERT INTO audit_logs(admin_user_id,action,target_type,target_id,detail) VALUES(?,?,?,?,?)", [req.user.id,status === "suspended" ? "suspend_user" : "activate_user","user",req.params.id,""]);
  res.json({ ok: true });
});
app.patch("/api/admin/comments/:id", requireUser, requireAdmin, async (req, res) => {
  await pool.execute("UPDATE comments SET status=? WHERE id=?", [req.body.status === "visible" ? "visible" : "hidden",req.params.id]);
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "public"), { maxAge: process.env.NODE_ENV === "production" ? "1h" : 0 }));
app.get("/{*path}", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: "服务器暂时无法处理请求" }); });

if (require.main === module) {
  const port = Number(process.env.PORT || 3100);
  pool.query("SELECT 1").then(() => app.listen(port, "127.0.0.1", () => console.log(`D4秘典已启动: http://127.0.0.1:${port}`))).catch((error) => { console.error("数据库连接失败", error.message); process.exit(1); });
}
module.exports = { app, pool };
