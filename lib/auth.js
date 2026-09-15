export function invalidateSession(userId) {
  const current = JSON.parse(localStorage.getItem("kmitlmap:user") || "null");

  if (current?.id === userId) {
    localStorage.removeItem("kmitlmap:user");
    window.location.reload();
  }
}