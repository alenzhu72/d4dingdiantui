"use client";

import { useMemo, useState } from "react";

const classes = [
  { name: "野蛮人", en: "BARBARIAN", icon: "⚔", color: "#c86b45" },
  { name: "德鲁伊", en: "DRUID", icon: "♜", color: "#8f9c6b" },
  { name: "死灵法师", en: "NECROMANCER", icon: "☠", color: "#78a89d" },
  { name: "游侠", en: "ROGUE", icon: "➶", color: "#775e91" },
  { name: "魔法师", en: "SORCERER", icon: "✦", color: "#547aa5" },
  { name: "灵巫", en: "SPIRITBORN", icon: "◈", color: "#9aa85b" },
];

const builds = [
  { title: "先祖之锤 · 赛季冲层", cls: "野蛮人", tier: "S", author: "荒原狼", patch: "S9 · 2.3", likes: 1286, tags: ["终局", "秘境冲层"], accent: "#ce6e49" },
  { title: "风暴狼 · 极速刷图", cls: "德鲁伊", tier: "S", author: "月下橡木", patch: "S9 · 2.3", likes: 947, tags: ["速刷", "低门槛"], accent: "#849865" },
  { title: "暗影召唤 · 懒人流", cls: "死灵法师", tier: "A", author: "白骨灯塔", patch: "S9 · 2.3", likes: 829, tags: ["召唤", "开荒"], accent: "#71a89b" },
  { title: "刀锋乱舞 · 百层速通", cls: "游侠", tier: "S", author: "鸦羽", patch: "S9 · 2.3", likes: 756, tags: ["高机动", "终局"], accent: "#846c9e" },
  { title: "冰霜球 · 永冻控制", cls: "魔法师", tier: "A", author: "寒星", patch: "S9 · 2.3", likes: 688, tags: ["控场", "组队"], accent: "#5c83ae" },
  { title: "羽毛齐射 · 毒伤爆发", cls: "灵巫", tier: "A", author: "雨林猎手", patch: "S9 · 2.3", likes: 614, tags: ["爆发", "首领"], accent: "#a4ad5d" },
];

const nodes = [
  ["大地尖刺", "基础", 18, 52], ["粉碎", "核心", 31, 36], ["大地壁垒", "防御", 48, 50],
  ["践踏", "伙伴", 62, 33], ["灰熊狂怒", "终极", 76, 51], ["熊人之力", "关键", 89, 38],
] as const;

export default function Home() {
  const [activeClass, setActiveClass] = useState("全部职业");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("技能树");
  const [publishOpen, setPublishOpen] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState(builds[0]);

  const visible = useMemo(() => builds.filter((b) =>
    (activeClass === "全部职业" || b.cls === activeClass) &&
    (b.title.includes(query) || b.cls.includes(query) || b.tags.some(t => t.includes(query)))
  ), [activeClass, query]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="D4秘典首页"><span className="brand-mark">D4</span><span>秘典</span><i>BETA</i></a>
        <nav><a href="#builds">Builds</a><a href="#planner">配装模拟器</a><a href="#tier">天梯榜</a><a href="#guides">攻略库</a></nav>
        <div className="header-actions"><button className="search-button" onClick={() => document.getElementById("search")?.focus()}>⌕ <span>搜索</span><kbd>⌘ K</kbd></button><button className="ghost">登录</button><button className="primary" onClick={() => setPublishOpen(true)}>＋ 发布 Build</button></div>
      </header>

      <section className="hero" id="top">
        <div className="embers" />
        <p className="eyebrow"><span /> DIABLO IV BUILD LIBRARY <span /></p>
        <h1>你的庇护之地<br/><em>终极配装指南</em></h1>
        <p className="hero-copy">发现、规划并分享最强 Build。技能树、巅峰盘、装备词缀，<br/>每一步都有迹可循。</p>
        <div className="hero-search"><span>⌕</span><input id="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索 Build、技能或职业…"/><button onClick={()=>document.getElementById("builds")?.scrollIntoView({behavior:"smooth"})}>探索 Builds</button></div>
        <div className="season"><b>赛季 9</b><span>原罪之潮</span><i>当前版本 2.3.1</i></div>
      </section>

      <section className="class-section" aria-label="职业筛选">
        <button className={activeClass === "全部职业" ? "class-card active" : "class-card"} onClick={()=>setActiveClass("全部职业")}><span className="all-icon">✥</span><b>全部职业</b><small>ALL CLASSES</small></button>
        {classes.map(c => <button key={c.name} className={activeClass === c.name ? "class-card active" : "class-card"} style={{"--class-color":c.color} as React.CSSProperties} onClick={()=>setActiveClass(c.name)}><span>{c.icon}</span><b>{c.name}</b><small>{c.en}</small></button>)}
      </section>

      <section className="content" id="builds">
        <div className="section-head"><div><p className="eyebrow left"><span/> META BUILDS</p><h2>热门 Build</h2><p>由社区验证，持续追踪版本更新</p></div><div className="filters"><button className="selected">综合推荐</button><button>最新发布</button><button>最多收藏</button></div></div>
        <div className="build-grid">
          {visible.map(b => <article className="build-card" key={b.title} style={{"--accent":b.accent} as React.CSSProperties} onClick={()=>{setSelectedBuild(b);document.getElementById("planner")?.scrollIntoView({behavior:"smooth"})}} tabIndex={0}>
            <div className="card-glow"/><div className="card-top"><span className="tier">{b.tier}</span><span className="class-pill">{classes.find(c=>c.name===b.cls)?.icon} {b.cls}</span><span className="patch">{b.patch}</span></div>
            <h3>{b.title}</h3><div className="skill-row">{["◆","✹","◉","✦","⬡","☾"].map((x,i)=><span key={i}>{x}</span>)}</div>
            <div className="tags">{b.tags.map(t=><span key={t}>{t}</span>)}</div><div className="author"><span className="avatar">{b.author[0]}</span><span><small>作者</small>{b.author}</span><b>♡ {b.likes.toLocaleString()}</b></div>
          </article>)}
          {visible.length===0 && <div className="empty">没有找到匹配的 Build，换个关键词试试。</div>}
        </div>
      </section>

      <section className="planner-wrap" id="planner">
        <div className="planner-intro"><p className="eyebrow left"><span/> INTERACTIVE PLANNER</p><h2>{selectedBuild.title}</h2><p>完整拆解每一个技能点、巅峰节点与装备词缀。点击卡片上任意 Build 即可切换预览。</p><div className="summary"><span><b>100</b>等级</span><span><b>58</b>技能点</span><span><b>225</b>巅峰点</span><span><b>{selectedBuild.tier}</b>强度评级</span></div><button className="primary" onClick={()=>setPublishOpen(true)}>复制并编辑此 Build</button></div>
        <div className="planner-panel">
          <div className="tabs">{["技能树","巅峰盘","装备","雕文 · 符印"].map(t=><button key={t} onClick={()=>setTab(t)} className={tab===t?"active":""}>{t}</button>)}</div>
          {tab === "技能树" ? <div className="tree-canvas"><div className="tree-line"/>{nodes.map(([name,type,x,y],i)=><div className="tree-node" key={name} style={{left:`${x}%`,top:`${y}%`}}><span>{["✦","◆","◈","✹","⬡","☾"][i]}</span><b>{name}</b><small>{type}</small></div>)}</div> : <div className="diagram"><div className="board core">{tab === "巅峰盘" ? "起始盘" : tab === "装备" ? "武器 · 护甲 · 饰品" : "雕文与梦魇符印"}</div>{[1,2,3,4,5,6,7,8].map((n)=><span key={n} className={`gem g${n}`}>{n%2?"◆":"✦"}</span>)}</div>}
        </div>
      </section>

      <section className="community" id="tier"><div><p className="eyebrow left"><span/> BUILT BY PLAYERS</p><h2>分享你的战斗智慧</h2><p>创建专属 Build，保存技能与巅峰方案，让更多玩家从你的思路中受益。</p></div><div className="stats"><span><b>12,480</b>社区 Builds</span><span><b>38,200</b>注册玩家</span><span><b>96%</b>版本覆盖率</span></div><button className="primary large" onClick={()=>setPublishOpen(true)}>开始创建 Build →</button></section>

      <footer id="guides"><div className="brand"><span className="brand-mark">D4</span><span>秘典</span></div><p>为庇护之地的每一位冒险者打造。</p><div><a>关于我们</a><a>更新日志</a><a>社区规范</a><a>联系我们</a></div><small>非暴雪娱乐官方网站。Diablo IV 及相关素材版权归 Blizzard Entertainment 所有。</small></footer>

      {publishOpen && <div className="modal-backdrop" onMouseDown={()=>setPublishOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="close" onClick={()=>setPublishOpen(false)}>×</button><p className="eyebrow left"><span/> BUILD CREATOR</p><h2>创建你的 Build</h2><p>登录后即可保存、发布和持续更新你的方案。</p><label>Build 名称<input placeholder="例如：先祖之锤 · 百层速刷"/></label><label>选择职业<select><option>野蛮人</option><option>德鲁伊</option><option>死灵法师</option><option>游侠</option><option>魔法师</option><option>灵巫</option></select></label><div className="modal-actions"><button className="ghost" onClick={()=>setPublishOpen(false)}>取消</button><button className="primary" onClick={()=>alert("账号发布功能将在正式身份服务接入后启用。")}>登录并继续</button></div></div></div>}
    </main>
  );
}
