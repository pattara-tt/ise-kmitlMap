/* =========================================================
   Small Components / Styles
========================================================= */

export function InfoRow({
  label,
  value
}) {
  return <div style={{
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 5,
    fontSize: 11.5
  }}>
      <span style={{
      color: "#5F6368"
    }}>
        {label}
      </span>

      <b>{value}</b>
    </div>;
}

export const editorButton = {
  border: "1px solid #DADCE0",
  borderRadius: 7,
  padding: "8px 12px",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700
};

export const smallEditorButton = {
  border: "1px solid #DADCE0",
  borderRadius: 6,
  padding: "6px 10px",
  background: "#fff",
  cursor: "pointer",
  fontSize: 12
};
