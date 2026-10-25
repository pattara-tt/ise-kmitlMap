"use client";
import { useState, useRef, useEffect } from "react";
import { Icon, useCollection, askConfirm } from "../../ui";
import DOMPurify from "dompurify";

const EMOJI_GROUPS = [
  { label: "หน้ายิ้ม", tab: "😀", emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🤭 🫢 🫣 🤫 🤥 😶 😐 😑 😬 🙄 😯 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕" },
  { label: "ผู้คน", tab: "👋", emojis: "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 💪 🦾 🧠 👀 👁️ 👶 🧒 👦 👧 👨 👩 🧑 👨‍🏫 👩‍🏫 🧑‍🏫 👨‍💻 👩‍💻 🧑‍💻 👨‍🔬 👩‍🔬 🧑‍🔬 👨‍🎓 👩‍🎓 🧑‍🎓 👷 👮 🧑‍⚕️ 🧑‍🍳 🧑‍💼 👨‍👩‍👧 👥" },
  { label: "สัตว์และธรรมชาติ", tab: "🌿", emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦅 🦉 🐺 🐗 🐴 🦄 🐝 🦋 🐌 🐞 🐜 🦟 🐢 🐍 🦎 🐙 🦑 🦐 🐠 🐟 🐬 🐳 🦈 🐊 🦓 🦍 🐘 🦒 🌳 🌲 🌴 🌵 🌾 🌱 🌿 ☘️ 🍀 🍃 🍂 🍁 🌷 🌹 🌺 🌸 🌼 🌻 🌞 🌙 ⭐ 🌈 🌧️ 🔥 💧" },
  { label: "อาหาร", tab: "☕", emojis: "🍎 🍏 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥬 🥒 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🍞 🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥗 🍲 🍛 🍜 🍝 🍣 🍱 🥟 🍚 🍙 🍘 🍢 🍡 🍦 🍰 🎂 🍩 🍪 🍫 🍬 🍯 🥛 🍼 ☕ 🍵 🧃 🥤 🧋" },
  { label: "กิจกรรม", tab: "🏆", emojis: "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥅 🏒 🥊 🥋 🎯 🛹 🛼 🏋️ 🧘 🏊 🚴 🧩 🎮 🕹️ 🎲 ♟️ 🎭 🎨 🎤 🎧 🎼 🎹 🥁 🎸 🎺 🎻 🎬 🎪 🎟️ 🏆 🥇 🥈 🥉 🎖️ 🎗️ 🎫 🎁 🎈 🎉 🎊 🎀 🎓 📚" },
  { label: "สถานที่และการเดินทาง", tab: "🏢", emojis: "🏠 🏡 🏘️ 🏚️ 🏗️ 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 🏛️ 🏟️ 🛖 🏕️ ⛺ 🌉 🚗 🚕 🚙 🚌 🚎 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🛴 🚲 🛵 🏍️ 🚂 🚆 🚇 🚉 🚊 🚝 🚄 ✈️ 🚀 🚁 🚢 🚤 ⚓ 🚦 🚥 🚏 🗺️ 🧭" },
  { label: "สิ่งของ", tab: "💡", emojis: "🚪 🪟 🪑 🛋️ 🛏️ 🚽 🚻 🚹 🚺 🚼 ♿ 🛗 🪜 🧱 🧯 🧰 🛠️ 🔧 🔨 🪛 🪚 🔩 ⚙️ 🔑 🗝️ 🔒 🔓 🧲 💡 🔦 🕯️ 🔌 🔋 💻 🖥️ 🖨️ ⌨️ 🖱️ 📱 ☎️ 📞 📺 📷 📹 📽️ 📼 📻 🎙️ 🔬 🔭 🧪 🧫 🧬 💉 💊 🩺 🩹 🌡️ 🧹 🧺 🧼 🧴 🚿 🛁 🪥 🪠 🗑️ 📦 📁 📂 📄 📃 📋 📌 📍 ✏️ 📝 🖊️ 📐 📏 📚 📖 📒 📔 🗃️ 🗄️ 🗂️ 🛒" },
  { label: "สัญลักษณ์", tab: "🔣", emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ✅ ☑️ ✔️ ❌ ❎ ➕ ➖ ➗ ➰ ➿ ⁉️ ❓ ❔ ❕ ❗ 💯 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🔺 🔻 🔶 🔷 🔸 🔹 🔲 🔳 🔘 📶 🆘 🆕 🆗 🆙 ♻️ ⚠️ 🚫 ⛔ 🛑 🔔 🔕 🔍 🔎 🔗" },
  { label: "ธง", tab: "🚩", emojis: "🏳️ 🏴 🏁 🚩 🎌 🇹🇭 🇯🇵 🇰🇷 🇨🇳 🇹🇼 🇺🇸 🇬🇧 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇧🇷 🇨🇦 🇦🇺 🇳🇿 🇸🇬 🇲🇾 🇻🇳 🇮🇩 🇵🇭 🇮🇳 🇳🇵 🇱🇦 🇰🇭 🇲🇲" },
  { label: "วิทยาศาสตร์", tab: "🔬", emojis: "🔬 🔭 🧪 🧫 🧬 ⚗️ 🦠 🧑‍🔬 👨‍🔬 👩‍🔬 ⚛️ 🧲 🧮 🌡️ 💉 💊 🩺 🩻 🫀 🫁 🧠 🦴 🦷 🧯 💡 🔋 🔌 ⚡ 🔥 💧 🧊 🌋 🌍 🌎 🌏 🌕 ☀️ 🪐 🌌 ☄️ 🛰️ 🚀 🛸 🧑‍🚀 🤖 📐 📏 📊 📈 🌱 🐛 🧱" },
];
const EMOJI_ALIASES = { "ห้องเรียน":"🏫 📚 📝 🪑", "ห้องน้ำ":"🚻 🚽 🚹 🚺 🚿", "ลิฟต์":"🛗", "บันได":"🪜", "อาจารย์":"👨‍🏫 👩‍🏫 🧑‍🏫", "ประชุม":"👥 🪑 🗣️", "ทดลอง":"🔬 🧪 🧬", "คอม":"💻 🖥️ 🖨️", "co-working":"💻 ☕ 🛋️", "ประตู":"🚪", "ทางออก":"🚪 🚩", "เรียน":"🏫 📚", "toilet":"🚽 🚻", "stairs":"🪜", "elevator":"🛗", "office":"🏢 🧑‍💼", "lab":"🔬 🧪", "library":"📚 📖", "วิทยาศาสตร์":"🔬 🧪 🧬 🔭 ⚛️", "เคมี":"🧪 ⚗️ 🧫", "ฟิสิกส์":"⚛️ 🧲 ⚡ 🔋", "ชีววิทยา":"🧬 🦠 🧫 🌱", "ดาราศาสตร์":"🔭 🪐 🌌 🌕", "science":"🔬 🧪 🧬 🔭", "chemistry":"🧪 ⚗️", "physics":"⚛️ 🧲 ⚡", "biology":"🧬 🦠 🌱", "astronomy":"🔭 🪐 🌌" };
function EmojiPicker({onSelect, onClose}) {
  const [category, setCategory] = useState(0);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);
  useEffect(() => {
    const closeOutside = (event) => {if(boxRef.current && !boxRef.current.contains(event.target)) onClose();};
    const escape = (event) => {if(event.key === "Escape") onClose();};
    document.addEventListener("pointerdown",closeOutside);
    document.addEventListener("keydown",escape);
    return () => {document.removeEventListener("pointerdown",closeOutside);document.removeEventListener("keydown",escape);};
  },[onClose]);
  const q = query.trim().toLowerCase();
  const aliases = q ? Object.entries(EMOJI_ALIASES).filter(([name])=>name.includes(q)).flatMap(([,emojis])=>emojis.split(" ")) : [];
  const selected = q ? [...new Set([...aliases, ...EMOJI_GROUPS.filter(group=>group.label.toLowerCase().includes(q)).flatMap(group=>group.emojis.split(" ")), ...EMOJI_GROUPS.flatMap(group=>group.emojis.split(" ")).filter(icon=>icon.includes(query.trim()))])] : EMOJI_GROUPS[category].emojis.split(" ");
  return <div ref={boxRef} role="dialog" aria-label="เลือก Emoji" style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:80,width:"min(350px, 90vw)",padding:12,border:"1px solid #DADCE0",borderRadius:14,background:"white",boxShadow:"0 12px 35px #20212430"}}>
    <div style={{ position: "relative", marginBottom: 10 }}>
      <Icon name="search" size={16} color="#5F6368" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      <input aria-label="ค้นหา Emoji" autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search / ค้นหา" style={{...field,padding:"9px 12px 9px 34px",borderRadius:22}} />
    </div>
    <div style={{display:"flex",gap:1,overflowX:"auto",borderBottom:"1px solid #E8EAED",paddingBottom:5,marginBottom:8}}>
      {EMOJI_GROUPS.map((group,index)=><button key={group.label} type="button" title={group.label} aria-label={group.label} onClick={()=>{setCategory(index);setQuery("");}} style={{border:0,borderBottom:category===index&&!q?"3px solid #1A73E8":"3px solid transparent",background:"transparent",padding:"6px 8px",fontSize:20,cursor:"pointer"}}>{group.tab}</button>)}
    </div>
    <div style={{fontSize:11,fontWeight:700,color:"#70757A",marginBottom:7}}>{q?"ผลการค้นหา":EMOJI_GROUPS[category].label}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(8,minmax(0,1fr))",gap:2,maxHeight:255,overflowY:"auto"}}>
      {selected.map((icon,index)=><button type="button" key={index} title={icon} aria-label={`เลือก ${icon}`} onClick={()=>{onSelect(icon);onClose();}} style={{border:0,background:"transparent",fontSize:26,borderRadius:7,padding:"5px 0",cursor:"pointer",lineHeight:1.2}} onMouseEnter={e=>e.currentTarget.style.background="#E8F0FE"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{icon}</button>)}
    </div>
    {selected.length===0&&<div style={{fontSize:12,color:"#70757A",padding:16}}>ไม่พบ Emoji — ลองเลือกหมวดหมู่ หรือพิมพ์สัญลักษณ์ลงช่องได้โดยตรง</div>}
  </div>;
}
const field = { padding: "10px 12px", border: "1px solid #DADCE0", borderRadius: 9, width: "100%", fontSize: 14, boxSizing: "border-box" };
const btn = { border: "1px solid #DADCE0", padding: "9px 12px", background: "white", cursor: "pointer", borderRadius: 8 };
const blank = {name: "", icon: "/data/icon/room.svg", color: "#1A73E8", description: ""
};
const isImageIcon = (value) => typeof value === "string" && ( /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,/.test(value) || /^\/data\/icon\/[a-zA-Z0-9_-]+\.svg$/.test(value));
function IconPreview({icon, size=28}) {
  return isImageIcon(icon) ? <img src={icon} alt="ไอคอนประเภทห้อง" width={size} height={size} style={{objectFit:"contain",borderRadius:5}} /> : <span style={{fontSize:size,lineHeight:1}}>{icon||"❔"}</span>;
}
async function convertImage(file) {
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml"
  ];

  if (!allowed.includes(file.type)) {
    throw new Error("รองรับ PNG, JPG, WebP และ SVG เท่านั้น");
  }

  if (file.size > 3 * 1024 * 1024) {
    throw new Error("ไฟล์ต้องไม่เกิน 3 MB");
  }

  if (
    file.type === "image/svg+xml" ||
    file.name.toLowerCase().endsWith(".svg")
    ) {
    const raw = await file.text();

    const clean = DOMPurify.sanitize(raw, {
        USE_PROFILES: { svg: true, svgFilters: false },
        FORBID_TAGS: [
        "script", "foreignObject", "iframe",
        "image", "use", "animate", "set"
        ],
        FORBID_ATTR: [
        "onload", "onclick", "onerror", "href", "xlink:href"
        ]
    });

    const parsed = new DOMParser().parseFromString(
        clean,
        "image/svg+xml"
    );

    if (
        parsed.querySelector("parsererror") ||
        parsed.documentElement.localName !== "svg"
    ) {
        throw new Error("ไฟล์ SVG ไม่ถูกต้อง");
    }

    const svgBlob = new Blob([clean], {
        type: "image/svg+xml"
    });

    const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(svgBlob);
    });

    return dataUrl;
}

  const url = URL.createObjectURL(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(
        new Error("ไม่สามารถอ่านภาพได้")
      );
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    const ratio = Math.min(
      1,
      128 / Math.max(img.naturalWidth, img.naturalHeight)
    );

    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));

    canvas.getContext("2d").drawImage(
      img, 0, 0, canvas.width, canvas.height
    );

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function RoomTypesManager({user}) {
  const {items,loading,create,patch,destroy} = useCollection("roomTypes");
  const [form,setForm] = useState({...blank});
  const [editing,setEditing] = useState(null);
  const [busy,setBusy] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [pickerOpen,setPickerOpen] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const update=(key,value)=>setForm(prev=>({...prev,[key]:value}));
  const uploadIcon=async(e)=>{
    const file=e.target.files?.[0];e.target.value="";
    if(!file)return;
    setUploading(true);setError("");setSuccess("");
    try {update("icon",await convertImage(file));} catch(ex){setError(ex.message||"อัปโหลดรูปไม่สำเร็จ");}
    finally{setUploading(false);}
  };
  const reset=()=>{setForm({...blank});setEditing(null);setError("");};
  const save=async(e)=>{
    e.preventDefault();setError("");setSuccess("");
    const name=form.name.trim();
    if (!name || !form.icon.trim()) {setError("กรุณาระบุชื่อประเภทและไอคอน");return;}
    if(items.some(x=>x.name.toLocaleLowerCase()===name.toLocaleLowerCase() && x.id!==editing)) {setError("ชื่อประเภทนี้มีอยู่แล้ว");return;}
    setBusy(true);
    try {
      const body={name,icon:form.icon.trim(),color:form.color,description:form.description.trim()};
      if(editing) await patch(editing,body,user);else await create(body,user);
      reset();setSuccess("บันทึกประเภทห้องเรียบร้อย");
    } catch(ex) {setError(ex?.message||"บันทึกไม่สำเร็จ");}
    finally {setBusy(false);}
  };
  const remove=async(item)=>{
    if(!(await askConfirm(`ลบประเภทห้อง “${item.name}” ใช่หรือไม่? ห้องที่ตั้งประเภทนี้ไว้เดิมจะยังมีชื่อประเภทเก็บอยู่`, { title: "ลบประเภทห้อง", confirmLabel: "ลบ", tone: "danger" })))return;
    setBusy(true);setError("");setSuccess("");
    try {await destroy(item.id,user); if(editing===item.id)reset();setSuccess("ลบประเภทห้องเรียบร้อย");}
    catch(ex){setError(ex?.message||"ลบไม่สำเร็จ");}
    finally{setBusy(false);}
  };
  return <div style={{padding:"28px 32px",maxWidth:1100,margin:"0 auto",color:"#202124"}}>
    <h2 style={{marginTop:0}}>จัดการประเภทห้องและไอคอน</h2>
    <div style={{display:"grid",gridTemplateColumns:"minmax(260px, 380px) minmax(300px, 1fr)",gap:24,alignItems:"start"}}>
      <form onSubmit={save} style={{padding:20,border:"1px solid #DADCE0",borderRadius:12,background:"white",display:"grid",gap:12}}>
        <strong>{editing?"แก้ไขประเภทห้อง":"เพิ่มประเภทห้องใหม่"}</strong>
        <label style={{fontSize:13}}>ชื่อประเภทห้อง<input style={{...field,marginTop:5}} maxLength={80} value={form.name} onChange={e=>update("name",e.target.value)} placeholder="เช่น ห้องปฏิบัติการเคมี" required /></label>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:10,background:"#F7F9FC",borderRadius:10}}>
          <div style={{width:52,height:52,display:"grid",placeItems:"center",borderRadius:10,background:"white",border:"1px solid #DADCE0"}}><IconPreview icon={form.icon} size={36}/></div>
          <div><strong style={{fontSize:13}}>ตัวอย่างไอคอน</strong><div style={{fontSize:12,color:"#5F6368"}}>เลือกจากคลัง พิมพ์ Emoji หรืออัปโหลดรูป</div></div>
        </div>
        <div style={{fontSize:13}}>
          <label htmlFor="custom-room-emoji">กำหนด Emoji / อักขระอื่นเอง</label>
          <div style={{position:"relative",marginTop:5}}>
            <div style={{display:"flex",gap:7}}>
              <input id="custom-room-emoji" style={{...field,flex:1,minWidth:0}} maxLength={24} value={isImageIcon(form.icon)?"":form.icon} onChange={e=>update("icon",e.target.value)} placeholder="เช่น 🏫" />
              <button type="button" aria-label="เปิดตัวเลือก Emoji" aria-expanded={pickerOpen} onClick={()=>setPickerOpen(open=>!open)} style={{...btn,fontSize:22,padding:"6px 12px"}}>😀</button>
            </div>
            {pickerOpen&&<EmojiPicker onSelect={icon=>update("icon",icon)} onClose={()=>setPickerOpen(false)}/>}
          </div>
        </div>
            <label style={{ ...btn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
                boxSizing: "border-box", minHeight: 46, cursor: uploading ? "wait" : "pointer", fontSize: 13, textAlign: "center"}}>
            <span>
                {uploading ? "⏳ กำลังเตรียมรูป..." : "📁 อัปโหลดไอคอน SVG / PNG / JPG / WebP"}
            </span>

            <input
                type="file" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" onChange={uploadIcon}
                disabled={uploading} style={{ display: "none" }}
            />
            </label>
        <small style={{color:"#5F6368"}}>ปรับภาพให้ไม่เกิน 128×128 พิกเซล ก่อนเก็บในฐานข้อมูล รองรับไฟล์ต้นฉบับไม่เกิน 3 MB</small>
        <label style={{fontSize:13}}>สีไอคอน <input type="color" style={{display:"block",width:70,height:34}} value={form.color} onChange={e=>update("color",e.target.value)}/></label>
        <label style={{fontSize:13}}>คำอธิบาย (ไม่บังคับ)<textarea style={{...field,marginTop:5,minHeight:70}} maxLength={250} value={form.description} onChange={e=>update("description",e.target.value)} /></label>
        <div style={{display:"flex",gap:8}}><button disabled={busy||uploading} type="submit" style={{...btn,background:"#1A73E8",color:"white",flex:1}}>{busy?"กำลังบันทึก...":editing?"บันทึกการแก้ไข":"เพิ่มประเภทห้อง"}</button>{editing&&<button type="button" onClick={reset} style={btn}>ยกเลิก</button>}</div>
        {error&&<p role="alert" style={{color:"#B3261E",fontSize:13,margin:0}}>{error}</p>}
        {success&&<p role="status" style={{color:"#137333",fontSize:13,margin:0}}>{success}</p>}
      </form>
      <section style={{padding:20,border:"1px solid #DADCE0",borderRadius:12,background:"white"}}>
        <strong>ประเภทห้องทั้งหมด ({items.length})</strong>
        {loading?<p>กำลังโหลด...</p>:items.length===0?<p>ยังไม่มีประเภทห้อง</p>:<div style={{marginTop:12,display:"grid",gap:10}}>{items.map(item=><div key={item.id} style={{display:"flex",gap:12,alignItems:"center",borderBottom:"1px solid #E8EAED",padding:"10px 0"}}><div style={{fontSize:26,minWidth:40,textAlign:"center",background:item.color+"18",borderRadius:8,padding:6}}><IconPreview icon={item.icon} size={28}/></div><div style={{flex:1,minWidth:0}}><strong>{item.name}</strong><div style={{fontSize:12,color:"#5F6368"}}>{item.description||"ไม่มีคำอธิบาย"}</div></div><button type="button" style={btn} disabled={busy} onClick={()=>{setEditing(item.id);setForm({name:item.name,icon:item.icon,color:item.color,description:item.description||""});setError("");setSuccess("");}}>แก้ไข</button><button type="button" style={{...btn,color:"#B3261E"}} disabled={busy} onClick={()=>remove(item)}>ลบ</button></div>)}</div>}
      </section>
    </div>
  </div>;
}