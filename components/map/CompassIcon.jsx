export default // ไอคอนเข็มทิศจากไฟล์ SVG — ย้อมสีตามบริบทที่ใช้
function CompassIcon({
  size = 16,
  color = "currentColor",
  style
}) {
  return <span aria-hidden="true" style={{
    display: "inline-block",
    verticalAlign: "-2px",
    width: size,
    height: size,
    backgroundColor: color,
    WebkitMask: `url("/data/icon/ui/compass.svg") center/contain no-repeat`,
    mask: `url("/data/icon/ui/compass.svg") center/contain no-repeat`,
    ...style
  }} />;
}
