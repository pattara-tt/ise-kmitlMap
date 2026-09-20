"use client";

import { useEffect, useState } from "react";
import { Btn, Card, Field, Input, Pill, SearchBar, Select, Status, Table, Textarea, useCollection } from "../ui";
import { ROLE_LABEL } from "../../lib/usecases";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Actor: ฝ่ายดูแลระบบ — UC10–UC16
export default function AdminPanel({ uc, user }) {
  const [adminPage, setAdminPage] = useState(uc);

  useEffect(() => {
    setAdminPage(uc);
  }, [uc]);

  if (adminPage === "users") {
    return <Users />;
  }

  if (adminPage === "requests") {
    return (
      <Requests
        user={user}
        onReport={() => setAdminPage("report")}
        onQuota={() => setAdminPage("quota")}
      />
    );
  }

  if (adminPage === "quota") {
    return (<Quota user={user} onBack={() => setAdminPage("requests")}/>);
  }

  if (adminPage === "report") {
    return (<RequestReport onBack={() => setAdminPage("requests")} /> );
  }

  if (adminPage === "roles") {
    return <Roles user={user} />;
  }

  return <AccountStatus user={user} />;
}

// ── UC10 ค้นหาและเรียกดูข้อมูลผู้ใช้งาน ───────────────────
function Users() {
  const { items: users } = useCollection("users");
  const { items: requests } = useCollection("requests");

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const rows = users.filter((u) =>
    (!role || u.role === role) &&
    (u.email || "")
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  if (selectedUser) {
    return (
      <UserDetail
        user={selectedUser}
        requests={requests}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <>
      <h3>ค้นหาและเรียกดูข้อมูลผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาด้วยอีเมล"/>
      <Field label="กรองตามบทบาท">
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">ทั้งหมด</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <div style={{ fontSize: 12, color: "#5F6368", margin: "2px 0 8px" }}>พบ {rows.length} รายการ</div>
      <Table
        columns={[
          { key: "id", label: "รหัส", },
          { key: "name", label: "ชื่อ", },
          { key: "email", label: "อีเมล", },
          { key: "role", label: "บทบาท", render: (u) => (<Pill> {ROLE_LABEL[u.role] || u.role} </Pill>), },
          { key: "institution", label: "สถาบัน", },
          { key: "status", label: "สถานะ", render: (u) => (<Status value={u.status} />), },
          { key: "detail", label: "", render: (u) => (<Btn onClick={() => setSelectedUser(u)}> ดูรายละเอียด </Btn>), },
        ]}

        rows={rows}
        empty="ไม่พบผู้ใช้งานตามเงื่อนไข"
      />
    </>
  );
}

function UserDetail({ user, requests, onBack }) {
  const { items: accountHistory } = useCollection("accountHistory");
  const { items: users } = useCollection("users");
  const [historyDetailId, setHistoryDetailId] = useState(null);

  if (historyDetailId) {
    return (
      <AccountHistoryDetail
        historyId={historyDetailId}
        onBack={() => setHistoryDetailId(null)}
      />
    );
  }

  const userRequests = requests.filter(
    (r) => r.userId === user.id
  );

  const userHistory = accountHistory
  .filter((h) => h.userId === user.id)
  .sort(
    (a, b) =>
      new Date(b.changedAt) - new Date(a.changedAt)
  );

  const requestStats = {
    total: userRequests.length,
    pending: userRequests.filter(
      (r) => r.status === "pending"
    ).length,
    approved: userRequests.filter(
      (r) => r.status === "approved"
    ).length,
    rejected: userRequests.filter(
      (r) => r.status === "rejected"
    ).length,
  };

  function getHistoryDescription(history) {
    if (history.action === "ROLE_CHANGED") {
      const oldRole =
        ROLE_LABEL[history.oldValue] || history.oldValue || "-";

      const newRole =
        ROLE_LABEL[history.newValue] || history.newValue || "-";

      return `เปลี่ยนสิทธิ์จาก "${oldRole}" เป็น "${newRole}"`;
    }

    if (history.action === "SUSPENDED") {
      return "บัญชีผู้ใช้งานถูกระงับการใช้งาน";
    }

    if (history.action === "RESTORED") {
      return "บัญชีผู้ใช้งานได้รับการคืนสิทธิ์การใช้งาน";
    }

    return history.action || "-";
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Btn kind="ghost" onClick={onBack}>กลับ</Btn>
        <h3 style={{ margin: 0 }}> ข้อมูลผู้ใช้งาน </h3>
      </div>

      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {user.name}
            </div>

            <div
              style={{
                color: "#5F6368",
                marginTop: 4,
              }}
            >
              {user.email}
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: 999,
              background: user.status === "suspended" ? "#FCE8E6" : "#E6F4EA",
              color: user.status === "suspended"? "#B3261E" : "#137333",
              fontSize: 14,
              fontWeight: 800,
            }}>
            <span style={{ fontSize: 11 }}>●</span>
            {user.status === "suspended"? "ถูกระงับการใช้งาน" : "ใช้งาน"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#5F6368" }}>
              รหัสผู้ใช้งาน
            </div>
            <b>{user.id}</b>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#5F6368" }}>
              บทบาท
            </div>
            <b>
              {ROLE_LABEL[user.role] || user.role}
            </b>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#5F6368" }}>
              สถาบัน
            </div>
            <b>{user.institution || "-"}</b>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#5F6368" }}>
              วันที่สมัคร
            </div>
            <b>{formatDate(user.createdAt)}</b>
          </div>
        </div>
      </Card>

      {user.role === "user" && (
        <Card>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 14,
            }}
          >
            สถิติการส่งคำร้อง
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <StatBox
              label="ทั้งหมด"
              value={requestStats.total}
            />

            <StatBox
              label="รอตรวจสอบ"
              value={requestStats.pending}
            />

            <StatBox
              label="อนุมัติ"
              value={requestStats.approved}
            />

            <StatBox
              label="ไม่อนุมัติ"
              value={requestStats.rejected}
            />
          </div>
        </Card>
        )}

        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
              gap: 12,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              ประวัติการเปลี่ยนแปลงบัญชี
            </div>

            <span
              style={{
                fontSize: 12,
                color: "#5F6368",
              }}
            >
              {userHistory.length} รายการ
            </span>
          </div>

          {userHistory.length === 0 ? (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center",
                color: "#5F6368",
                fontSize: 13,
              }}
            >
              ยังไม่มีประวัติการเปลี่ยนแปลงบัญชี
            </div>
          ) : (
            <div>
              {userHistory.map((history, index) => {
                const isLast = index === userHistory.length - 1;

                return (
                  <div
                    key={history.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 1fr",
                      columnGap: 14,
                    }}
                  >
                    {/* Timeline line + dot */}
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#1F2937",
                          marginTop: 5,
                          zIndex: 1,
                        }}
                      />

                      {!isLast && (
                        <div
                          style={{
                            position: "absolute",
                            top: 15,
                            bottom: 0,
                            width: 1,
                            background: "#DADCE0",
                          }}
                        />
                      )}
                    </div>

                    {/* Event */}
                    <div
                      style={{
                        paddingBottom: isLast ? 0 : 22,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {getHistoryActionLabel(history.action)}
                          </div>

                          {history.action === "ROLE_CHANGED" && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                color: "#3C4043",
                              }}
                            >
                              {"เปลี่ยนจาก "}
                              {ROLE_LABEL[history.oldValue] ||
                                history.oldValue ||
                                "-"}
                              {" ไปเป็น "}
                              {ROLE_LABEL[history.newValue] ||
                                history.newValue ||
                                "-"}
                            </div>
                          )}

                          {history.action !== "ROLE_CHANGED" &&
                            history.reason && (
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 13,
                                  color: "#5F6368",
                                }}
                              >
                                เหตุผล: {history.reason}
                              </div>
                            )}

                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "#5F6368",
                            }}
                          >
                            {formatDate(history.changedAt)}
                            {" · "}
                            {users.find(
                              (u) => u.id === history.changedBy
                            )?.name || "-"}
                          </div>
                        </div>

                        <Btn
                          kind="ghost"
                          onClick={() => setHistoryDetailId(history.id)}
                        >
                          ดูรายละเอียด
                        </Btn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
    </>
  );
}

function getHistoryActionLabel(action) {
  if (action === "ROLE_CHANGED") {
    return "เปลี่ยนสิทธิ์ผู้ใช้งาน";
  }

  if (action === "SUSPENDED") {
    return "ระงับบัญชีผู้ใช้งาน";
  }

  if (action === "RESTORED") {
    return "คืนสิทธิ์การใช้งาน";
  }

  return action || "-";
}

function AccountHistoryDetail({ historyId, onBack }) {
  const { items: accountHistory } = useCollection("accountHistory");
  const { items: users } = useCollection("users");

  const history = accountHistory.find(
    (item) => item.id === historyId
  );

  if (!history) {
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <Btn kind="ghost" onClick={onBack}>
            กลับ
          </Btn>

          <h3 style={{ margin: 0 }}>
            รายละเอียดการเปลี่ยนแปลงบัญชี
          </h3>
        </div>

        <Card>
          <div
            style={{
              padding: "20px 0",
              textAlign: "center",
              color: "#5F6368",
            }}
          >
            ไม่พบข้อมูลประวัติการเปลี่ยนแปลง
          </div>
        </Card>
      </>
    );
  }

  const oldRole =
    ROLE_LABEL[history.oldValue] ||
    history.oldValue ||
    "-";

  const newRole =
    ROLE_LABEL[history.newValue] ||
    history.newValue ||
    "-";

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Btn kind="ghost" onClick={onBack}>
          กลับ
        </Btn>

        <h3 style={{ margin: 0 }}>
          รายละเอียดการเปลี่ยนแปลงบัญชี
        </h3>
      </div>

      <Card>
        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#5F6368",
              }}
            >
              ID
            </div>

            <b>{history.id}</b>
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                color: "#5F6368",
              }}
            >
              การกระทำ
            </div>

            <b>
              {getHistoryActionLabel(history.action)}
            </b>
          </div>

          {history.action === "ROLE_CHANGED" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#5F6368",
                  }}
                >
                  บทบาทเดิม
                </div>

                <b>{oldRole}</b>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#5F6368",
                  }}
                >
                  บทบาทใหม่
                </div>

                <b>{newRole}</b>
              </div>
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 12,
                color: "#5F6368",
              }}
            >
              เหตุผล
            </div>

            <div>
              {history.reason || "-"}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                color: "#5F6368",
              }}
            >
              ผู้ดำเนินการ
            </div>

            <div>
              {users.find((u) => u.id === history.changedBy)?.name || "-"}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                color: "#5F6368",
              }}
            >
              วันที่ดำเนินการ
            </div>

            <div>
              {formatDate(history.changedAt)}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}


function StatBox({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #E8EAED",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#5F6368",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          marginTop: 4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── UC11 ค้นหาและเรียกดูข้อมูลคำร้อง ──────────────────────
function Requests({ user, onReport, onQuota }) {
  const { items, reload } = useCollection("requests");
  const { items: users } = useCollection("users");
  const { items: rooms } = useCollection("rooms");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const rows = items
    .filter((r) => {
      // if (r.status === "cancelled") return false;

      const user = users.find((u) => u.id === r.userId);

      return (
        (!status || r.status === status) &&
        (
          (r.id || "") +
          (r.subject || "") +
          (r.detail || "") +
          (user?.email || "") +
          (r.userId || "")
        ).toLowerCase().includes(q.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        const dateCompare = String(b.createdAt || "").localeCompare(
          String(a.createdAt || "")
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return String(a.id || "").localeCompare(
          String(b.id || "")
        );
      }

      if (sortBy === "oldest") {
        const dateCompare = String(a.createdAt || "").localeCompare(
          String(b.createdAt || "")
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return String(a.id || "").localeCompare(
          String(b.id || "")
        );
      }

      return 0;
  });

  if (selectedRequest) {
    return (
      <RequestDetail
        request={selectedRequest}
        onBack={async () => {
          await reload();
          setSelectedRequest(null);
        }}
        user={user}
      />
    );
  }

  return (
    <>
      <h3>ค้นหาและเรียกดูข้อมูลคำร้อง</h3>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ค้นหาคำร้อง"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Field label="กรองตามสถานะ">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            <option value="pending">รอพิจารณา</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ไม่อนุมัติ</option>
            <option value="cancelled">ยกเลิกแล้ว</option>
          </Select>
        </Field>

        <Field label="เรียงลำดับ">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">วันที่ส่งล่าสุด</option>
            <option value="oldest">วันที่ส่งเก่าสุด</option>
          </Select>
        </Field>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>ค้นหาและเรียกดูข้อมูลคำร้อง</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={onQuota}>
            กำหนดจำนวนคำร้อง
          </Btn>

          <Btn onClick={onReport}>
            จัดทำสรุปคำร้อง
          </Btn>
        </div>
      </div>

      <Table 
        columns={[
          { key: "id", label: "เลขที่" },

          {
            key: "userId",
            label: "ผู้ยื่น",
            render: (r) => {
              const user = users.find((u) => u.id === r.userId);
              return user?.email || "-";
            },
          },

          { key: "subject", label: "หัวข้อ" },

          {
            key: "roomId",
            label: "สถานที่",
            render: (r) => {
              const room = rooms.find((room) => room.id === r.roomId);
              return room?.name || r.roomId || "-";
            },
          },

          { key: "createdAt", label: "วันที่ส่งคำร้อง" },

          {
            key: "status",
            label: "สถานะ",
            render: (r) => <Status value={r.status} />,
          },

          {
            key: "action",
            label: "การดำเนินการ",
            render: (r) => (
              <Btn onClick={() => setSelectedRequest(r)}>
                {r.status === "pending" ? "ตรวจสอบ" : "ดูรายละเอียด"}
              </Btn>
            ),
          },
        ]}
        rows={rows}
        empty="ไม่พบคำร้องตามเงื่อนไข"
      />
    </>
  );
}

// Selected Request page
function RequestDetail({ request, onBack, user }) {
  const { patch: patchRequest } = useCollection("requests");
  const { items: users } = useCollection("users");
  const { patch: patchRoom } = useCollection("rooms");

  const [note, setNote] = useState(request.note || "");
  const [currentStatus, setCurrentStatus] = useState(request.status);
  const [currentReviewedBy, setCurrentReviewedBy] = useState(request.reviewedBy || "");
  const [currentReviewedAt, setCurrentReviewedAt] = useState(request.reviewedAt || "");

  const requestUser = users.find(
    (u) => u.id === request.userId
  );

  async function decide(status) {
    const reviewedBy = user?.id || "";
    const reviewedAt = new Date().toISOString();

    await patchRequest(
      request.id,
      {
        status,
        note,
        reviewedBy,
        reviewedAt,
      },
      user
    );

    if (status === "approved" && request.roomId && request.after) {
      await patchRoom(
        request.roomId,
        request.after,
        user
      );
    }

    setCurrentStatus(status);
    setCurrentReviewedBy(reviewedBy);
    setCurrentReviewedAt(reviewedAt);
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Btn kind="ghost" onClick={onBack}>กลับ</Btn>

        <h2>
          ตรวจสอบคำร้อง
        </h2>
      </div>

      {/* ข้อมูลคำร้อง */}
      <Card>
        <div style={{ marginBottom: 12 }}>
          <b>เลขที่:</b> {request.id}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>ผู้ยื่น:</b>{" "}
          {requestUser?.email || request.userId || "-"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>หัวข้อ:</b> {request.subject || "-"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>รายละเอียด:</b> {request.detail || "-"}
        </div>

        <div style={{ marginBottom: 12 }}>
          <b>วันที่ส่งคำร้อง:</b>{" "}
          {formatDate(request.createdAt)}
        </div>

        <div>
          <b>สถานะ:</b>{" "}
          <Status value={currentStatus} />
        </div>
      </Card>

      {/* เปรียบเทียบข้อมูลเดิมกับข้อมูลที่ขอแก้ไข */}
      <Card>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          ข้อมูลที่ขอแก้ไข
        </div>

        <div
          style={{
            border: "1px solid #DADCE0",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              background: "#F8F9FA",
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: 800,
              color: "#5F6368",
            }}
          >
            <span>ข้อมูล</span>
            <span>ข้อมูลเดิม</span>
            <span>ข้อมูลที่ขอแก้ไข</span>
          </div>

          {Object.keys(request.after || {}).map((key) => {
            const oldValue = request.before?.[key];
            const newValue = request.after?.[key];

            return (
              <div
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "10px 12px",
                  fontSize: 12.5,
                  borderTop: "1px solid #E8EAED",
                }}
              >
                <span>
                  {FIELD_LABEL[key] || key}
                </span>

                <span>
                  {oldValue ?? "-"}
                </span>

                <span
                  style={{
                    fontWeight:
                      oldValue !== newValue ? 700 : 400,
                  }}
                >
                  {newValue ?? "-"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* การพิจารณา */}
      {currentStatus === "pending" ? (
        <Card>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            การพิจารณา
          </div>

          <Textarea
            placeholder="เหตุผลประกอบการพิจารณา"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ minHeight: 100 }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
            }}
          >
            <Btn
              kind="danger"
              onClick={() => decide("rejected")}
            >
              ไม่อนุมัติ
            </Btn>

            <Btn
              kind="ok"
              onClick={() => decide("approved")}
            >
              อนุมัติ
            </Btn>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ marginTop: 10 }}>
            <b>ผลการพิจารณา:</b>{" "}
            <Status value={currentStatus} />
          </div>
          <div>
            <b>เหตุผล:</b> {note || "-"}
          </div>
          <div style={{ marginTop: 10 }}>
            <b>ผู้พิจารณา: </b>
            {users.find((u) => u.id === currentReviewedBy)?.email || currentReviewedBy || "-"}
          </div>
          <div>
            <b>วันที่พิจารณา: </b>
            {formatDate(currentReviewedAt)}
          </div>
        </Card>
      )}
    </>
  );
}


// ── UC12 จัดการแก้ไขสิทธิ์ผู้ใช้งาน ───────────────────────
function Roles({ user }) {
  const { items, patch } = useCollection("users");
  const [q, setQ] = useState("");
  const rows = items.filter((u) =>
    (
      (u.id || "") +
      (u.name || "") +
      (u.email || "")
    ).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3>จัดการแก้ไขสิทธิ์ผู้ใช้งาน</h3>
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ค้นหาด้วยรหัส ชื่อ หรืออีเมล"
      />
      {rows.map((u) => (
        <Card key={u.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 14, color: "#202124" }}>
                {u.name}
              </b>

              <div style={{ fontSize: 11.5, color: "#5F6368" }}>
                {u.email} · {u.id}
              </div>

              {u.status === "suspended" && (
                <div
                  style={{
                    marginTop: 5,
                    display: "inline-block",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "#FDE8E7",
                    color: "#B3261E",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ถูกระงับการใช้งาน
                </div>
              )}
            </div>
            <Select
              value={u.role}
              onChange={async (e) => {
                const newRole = e.target.value;

                try {
                  await patch(u.id, { role: newRole }, user);
                  alert("เปลี่ยนสิทธิ์ผู้ใช้เรียบร้อย");
                } catch (error) {
                  alert(`เปลี่ยนสิทธิ์ไม่สำเร็จ: ${error.message}`);
                }
              }}
              style={{ width: 210 }}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </Card>
      ))}
    </>
  );
}

// ชื่อ field ที่อาจถูกขอแก้ไข → label ภาษาไทยสำหรับแสดงผล
const FIELD_LABEL = {
  teacher: "อาจารย์ประจำ",
  capacity: "ความจุ",
  name: "ชื่อ",
  role: "บทบาท",
  status: "สถานะ",
  label: "ชื่อสถานที่",
  type: "ประเภทสถานที่",
};

// ── UC14 จัดทำสรุปคำร้อง ───────────────────────
function RequestReport({ onBack }) {
  const { items: requests } = useCollection("requests");
  const { items: users } = useCollection("users");
  const { items: rooms } = useCollection("rooms");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState("pdf");

  const [selectedFields, setSelectedFields] = useState([
    "id",
    "applicant",
    "subject",
    "detail",
    "location",
    "createdAt",
    "status",
  ]);

  const [selectedRequests, setSelectedRequests] = useState({});

  const filteredRequests = requests.filter((r) => {
    if (r.status === "cancelled" && statusFilter !== "cancelled") {
      return false;
    }
    const keyword = search.trim().toLowerCase();

    const requestUser = users.find((u) => u.id === r.userId);

    const matchesSearch =
      !keyword ||
      (
        (r.id || "") +
        (r.subject || "") +
        (r.detail || "") +
        (r.userId || "") +
        (requestUser?.email || "")
      )
        .toLowerCase()
        .includes(keyword);

    const matchesStatus =
      !statusFilter || r.status === statusFilter;

    const matchesStartDate =
      !startDate || String(r.createdAt || "") >= startDate;

    const matchesEndDate =
      !endDate || String(r.createdAt || "") <= endDate;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesStartDate &&
      matchesEndDate
    );
  });

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setSearch("");
    setStatusFilter("");
  }

  const allFilteredSelected =
    filteredRequests.length > 0 &&
    filteredRequests.every((r) => !!selectedRequests[r.id]);

  const someFilteredSelected =
    filteredRequests.some((r) => !!selectedRequests[r.id]);

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedRequests((prev) => {
        const next = { ...prev };

        filteredRequests.forEach((r) => {
          delete next[r.id];
        });

        return next;
      });
    } else {
      setSelectedRequests((prev) => {
        const next = { ...prev };

        filteredRequests.forEach((r) => {
          next[r.id] = true;
        });

        return next;
      });
    }
  }

  const FIELD_OPTIONS = [
    { key: "id", label: "เลขที่คำร้อง" },
    { key: "applicant", label: "ผู้ยื่น" },
    { key: "subject", label: "หัวข้อ" },
    { key: "detail", label: "รายละเอียด" },
    { key: "location", label: "สถานที่" },
    { key: "createdAt", label: "วันที่ส่งคำร้อง", render: (r) => formatAdminDateTime(r.createdAt) },
    { key: "status", label: "สถานะ" },
    { key: "reviewer", label: "ผู้พิจารณา" },
    { key: "reviewedAt", label: "วันที่พิจารณา" },
    { key: "note", label: "เหตุผลประกอบการพิจารณา" },
    { key: "before", label: "ข้อมูลเดิม (Before)" },
    { key: "after", label: "ข้อมูลที่ขอแก้ไข (After)" },
  ];

  const FIELD_LABELS = {
    id: "เลขที่คำร้อง",
    applicant: "ผู้ยื่น",
    subject: "หัวข้อ",
    detail: "รายละเอียด",
    location: "สถานที่",
    createdAt: "วันที่ส่งคำร้อง",
    status: "สถานะ",
    reviewer: "ผู้พิจารณา",
    reviewedAt: "วันที่พิจารณา",
    note: "เหตุผลประกอบการพิจารณา",
    before: "ข้อมูลเดิม (Before)",
    after: "ข้อมูลที่ขอแก้ไข (After)",
  };

  const STATUS_LABELS = {
    pending: "รอพิจารณา",
    approved: "อนุมัติ",
    rejected: "ไม่อนุมัติ",
    cancelled: "ยกเลิกแล้ว",
  };

  const selectedRows = requests.filter(
    (r) => !!selectedRequests[r.id]
  );

  function formatChangedDataHTML(data) {
    if (!data) return "";

    if (typeof data !== "object") {
      return String(data);
    }

    return Object.entries(data)
      .map(([key, value]) => {
        const label = FIELD_LABEL[key] || key;

        if (value === null || value === undefined || value === "") {
          return `${label}: -`;
        }

        return `${label}: ${value}`;
      })
      .join("\n");
  }

  function formatChangedDataCsv(data) {
    if (!data) return "";

    if (typeof data !== "object") {
      return String(data);
    }

    return Object.entries(data)
      .map(([key, value]) => {
        const label = FIELD_LABEL[key] || key;

        if (value === null || value === undefined || value === "") {
          return `${label}: -`;
        }

        if (typeof value === "object") {
          return `${label}: ${JSON.stringify(value, null, 0)}`;
        }

        return `${label}: ${value}`;
      })
      .join(" | ");
  }

  function getExportValue(request, field) {
    const requestUser = users.find(
      (u) => u.id === request.userId
    );

    const room = rooms.find(
      (room) => room.id === request.roomId
    );

    const reviewer = users.find(
      (u) => u.id === request.reviewedBy
    );

    switch (field) {
      case "id":
        return request.id || "";

      case "applicant":
        return requestUser?.email || request.userId || "";

      case "subject":
        return request.subject || "";

      case "detail":
        return request.detail || "";

      case "location":
        return room?.name || request.roomId || "";

      case "createdAt":
        return request.createdAt || "";

      case "status":
        return STATUS_LABELS[request.status] || request.status || "";

      case "reviewer":
        return reviewer?.email || request.reviewedBy || "";

      case "reviewedAt":
        return request.reviewedAt || "";

      case "note":
        return request.note || "";

      case "before":
        return request.before || "";

      case "after":
        return request.after || "";

      default:
        return "";
    }
  }

  function escapeCsv(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportCSV(rows) {
    const headers = selectedFields.map(
      (field) => FIELD_LABELS[field]
    );

    const csvRows = [
      headers,
      ...rows.map((request) =>
        selectedFields.map((field) => {
          const value = getExportValue(request, field);

          if (field === "before" || field === "after") {
            return formatChangedDataCsv(value).replace(/\n/g, " | ");
          }

          return value;
        })
      )
    ];

    const csv = "\uFEFF" + csvRows
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `request-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportPDF(rows) {
    const body = rows
      .map(
        (request, index) => `
          <section class="request">
            <h2>รายการที่ ${index + 1}</h2>

            ${selectedFields
              .map(
                (field) => `
                  <div class="field">
                    <div class="label">
                      ${escapeHtml(FIELD_LABELS[field])}
                    </div>
                    <div class="value">
                      ${escapeHtml(
                        field === "before" || field === "after"
                        ? formatChangedDataHTML(getExportValue(request, field))
                        : getExportValue(request, field)
                      ).replace(/\n/g, "<br />")}
                    </div>
                  </div>
                `
              )
              .join("")}
          </section>
        `
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>สรุปคำร้อง</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 25px;
            color: #202124;
            font-size: 13px;
            line-height: 1.6;
          }

          h1 {
            font-size: 22px;
            margin-bottom: 8px;
          }

          .meta {
            font-size: 12px;
            color: #5F6368;
            margin-bottom: 24px;
          }

          .request {
            border: 1px solid #DADCE0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }

          .request h2 {
            font-size: 16px;
            margin: 0 0 14px;
          }

          .field {
            margin-bottom: 10px;
          }

          .label {
            font-weight: 700;
            margin-bottom: 2px;
          }

          .value {
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          @media print {
            body {
              padding: 0;
            }

            .request {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <h1>สรุปคำร้อง</h1>

        <div class="meta">
          ช่วงวันที่:
          ${startDate || "ทั้งหมด"}
          ถึง
          ${endDate || "ทั้งหมด"}
          |
          จำนวน ${rows.length} รายการ
        </div>

        ${body}
      </body>
      </html>
    `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

    if (!printWindow) {
      alert("ไม่สามารถเปิดหน้าสำหรับส่งออก PDF ได้");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function handleExport() {
    if (!selectedFields.length) {
      alert("กรุณาเลือกข้อมูลที่ต้องการส่งออก");
      return;
    }

    if (!selectedRows.length) {
      alert("กรุณาเลือกคำร้องที่ต้องการส่งออก");
      return;
    }

    if (format === "csv") {
      exportCSV(selectedRows);
    } else {
      exportPDF(selectedRows);
    }
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <Btn kind="ghost" onClick={onBack}>กลับ</Btn>

          <h3>
            จัดทำสรุปคำร้อง
          </h3>
        </div>
      </div>

      <Card>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          ประเภทไฟล์ที่ส่งออก
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "center",
          }}
        >
          <label>
            <input
              type="radio"
              name="exportFormat"
              value="pdf"
              checked={format === "pdf"}
              onChange={(e) => setFormat(e.target.value)}
            />
            {" "}PDF
          </label>

          <label>
            <input
              type="radio"
              name="exportFormat"
              value="csv"
              checked={format === "csv"}
              onChange={(e) => setFormat(e.target.value)}
            />
            {" "}CSV
          </label>
        </div>
      </Card>
      {/* เลือกคำร้อง start here */}
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <h4 style={{ margin: 0 }}>กำหนดข้อมูลคำร้อง</h4>

          <Btn kind="ghost" onClick={clearFilters}>
            ล้างตัวกรอง
          </Btn>
        </div>
        {/* ช่วงเวลา */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 12,
          }}
        >
          <Field label="วันที่เริ่มต้น">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </Field>

          <Field label="วันที่สิ้นสุด">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </Field>
        </div>

        {/* ค้นหา + กรองสถานะ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Field label="ค้นหาคำร้อง">
            <Input
              type="text"
              placeholder="🔎 ค้นหาคำร้อง"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
          </Field>

          <Field label="กรองตามสถานะ">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              <option value="pending">รอพิจารณา</option>
              <option value="approved">อนุมัติ</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </Select>
          </Field>
        </div>

        {/* ตารางคำร้อง */}
        <Table
          columns={[
            {
              key: "select",
              label: (
                <Input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAll}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        someFilteredSelected && !allFilteredSelected;
                    }
                  }}
                />
              ),
              render: (r) => (
                <Input
                  type="checkbox"
                  checked={!!selectedRequests[r.id]}
                  onChange={(e) => {
                    setSelectedRequests((prev) => ({
                      ...prev,
                      [r.id]: e.target.checked,
                    }));
                  }}
                />
              ),
            },
            { key: "id", label: "เลขที่" },

            {
              key: "userId",
              label: "ผู้ยื่น",
              render: (r) => {
                const requestUser = users.find(
                  (u) => u.id === r.userId
                );
                return requestUser?.email || "-";
              },
            },

            { key: "subject", label: "หัวข้อ" },

            {
              key: "roomId",
              label: "สถานที่",
              render: (r) => {
                const room = rooms.find(
                  (room) => room.id === r.roomId
                );
                return room?.name || r.roomId || "-";
              },
            },

            {
              key: "reviewedAt",
              label: "วันที่อนุมัติ",
              render: (r) => r.reviewedAt || "-",
            },

            {
              key: "reviewedBy",
              label: "อนุมัติโดย",
              render: (r) => {
                const reviewer = users.find(
                  (u) => u.id === r.reviewedBy
                );
                return reviewer?.email || r.reviewedBy || "-";
              },
            },

            {
              key: "status",
              label: "สถานะ",
              render: (r) => <Status value={r.status} />,
            },
          ]}
          rows={filteredRequests}
          empty="ไม่พบรายการคำร้อง"
        />

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #E8EAED",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            ฟิลด์ที่ต้องการส่งออก
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {FIELD_OPTIONS.map((field) => (
              <label
                key={field.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <Input
                  type="checkbox"
                  checked={selectedFields.includes(field.key)}
                  onChange={(e) => {
                    setSelectedFields((prev) =>
                      e.target.checked
                        ? [...prev, field.key]
                        : prev.filter(
                            (key) => key !== field.key
                          )
                    );
                  }}
                  style={{
                    width: "auto"
                  }}
                />

                {field.label}
              </label>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#5F6368",
              marginRight: "auto",
            }}
          >
            เลือกแล้ว {selectedRows.length} รายการ
          </div>

          <Btn onClick={handleExport}>
            ส่งออก {format === "pdf" ? "PDF" : "CSV"}
          </Btn>
        </div>
      </Card>
      {/* เลือกคำร้อง end here */}
    </>
  );
}

// ── UC15 กำหนดจำนวนการส่งคำร้อง ──────────────────────────
function Quota({ user, onBack }) {
  const { items, patch, create } = useCollection("requestQuota");
  const q = items[0];
  const [form, setForm] = useState(null);
  const cur = form || q || { perUserPerDay: 3, perUserPerMonth: 20 };

  async function save() {
    const payload = { perUserPerDay: Number(cur.perUserPerDay), perUserPerMonth: Number(cur.perUserPerMonth), updatedAt: new Date().toISOString().slice(0, 10), updatedBy: user.id };
    if (q?.id) await patch(q.id, payload, user);
    else await create(payload, user);
    alert("บันทึกการตั้งค่าเรียบร้อย");
  }

  return (
    <>
    <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <Btn kind="ghost" onClick={onBack}>กลับ</Btn>
          <h3>กำหนดจำนวนการส่งคำร้อง</h3>
      </div>
      <Card>
        <Field label="จำนวนคำร้องสูงสุดต่อคน ต่อวัน">
          <Input type="number" min={1} value={cur.perUserPerDay} onChange={(e) => setForm({ ...cur, perUserPerDay: e.target.value })} />
        </Field>
        <Field label="จำนวนคำร้องสูงสุดต่อคน ต่อเดือน">
          <Input type="number" min={1} value={cur.perUserPerMonth} onChange={(e) => setForm({ ...cur, perUserPerMonth: e.target.value })} />
        </Field>
        <Btn onClick={save}>บันทึกการตั้งค่า</Btn>
        {q ? <div style={{ fontSize: 11.5, color: "#5F6368", marginTop: 9 }}>แก้ไขล่าสุด {q.updatedAt}</div> : null}
      </Card>
    </>
  );
}

// ── UC16 จัดการสถานะบัญชีของผู้ใช้งาน ────────────────────
function AccountStatus({ user }) {
  const { items, patch } = useCollection("users");
  const { items: requests, patch: patchRequest } = useCollection("requests");
  const [q, setQ] = useState("");
  const [suspending, setSuspending] = useState(null); // user object ที่กำลังจะระงับ
  const [reason, setReason] = useState("");

  const [restoring, setRestoring] = useState(null);
  const [restoreReason, setRestoreReason] = useState("");
  const rows = items.filter((u) => (u.name + u.email).toLowerCase().includes(q.toLowerCase()));

  async function confirmSuspend() {
    if (!reason.trim()) {
      return alert("กรุณาระบุเหตุผลการระงับบัญชี");
    }

    try {
      const result = await patch(
        suspending.id,
        {
          status: "suspended",
          suspendReason: reason,
          suspendedAt: new Date().toISOString().slice(0, 10),
          suspendedBy: user.id
        },
        user
      );

      console.log("SUSPEND SUCCESS:", result);

      setSuspending(null);
      setReason("");

      alert("ระงับบัญชีเรียบร้อย");
    } catch (error) {
      console.error("SUSPEND ERROR:", error);
      alert(`ระงับบัญชีไม่สำเร็จ: ${error.message}`);
    }
  }

  async function confirmRestore() {
    if (!restoreReason.trim()) {
      return alert("กรุณาระบุเหตุผลการคืนสิทธิ์");
    }

    try {
      const result = await patch(
        restoring.id,
        {
          status: "active",
          restoreReason: restoreReason,
          restoredAt: new Date().toISOString().slice(0, 10),
          restoredBy: user.id
        },
        user
      );

      console.log("RESTORE SUCCESS:", result);

      setRestoring(null);
      setRestoreReason("");
    } catch (error) {
      console.error("RESTORE ERROR:", error);
      alert(`คืนสิทธิ์ไม่สำเร็จ: ${error.message}`);
    }
  }

  return (
    <>
      <h3>จัดการสถานะบัญชีของผู้ใช้งาน</h3>
      <SearchBar value={q} onChange={setQ} placeholder="ค้นหาบัญชีผู้ใช้" />

      {suspending ? (
        <Card style={{ border: "1px solid #F5C2C0" }}>
          <b style={{ fontSize: 13.5, color: "#D93025" }}>ระงับบัญชี: {suspending.name}</b>
          <div style={{ fontSize: 12, color: "#5F6368", margin: "4px 0 10px" }}>{suspending.email}</div>
          <Field label="เหตุผลการระงับบัญชี">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุเหตุผล เช่น ละเมิดข้อตกลงการใช้งาน" />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="danger" onClick={confirmSuspend}>ยืนยันระงับบัญชี</Btn>
            <Btn kind="ghost" onClick={() => { setSuspending(null); setReason(""); }}>ยกเลิก</Btn>
          </div>
        </Card>
      ) : null}

      {restoring ? (
        <Card>
          <b>คืนสิทธิ์บัญชี: {restoring.name}</b>

          <div style={{ fontSize: 12, color: "#5F6368", margin: "4px 0 10px" }}>
            {restoring.email}
          </div>

          <Field label="เหตุผลการคืนสิทธิ์บัญชี">
            <Textarea
              value={restoreReason}
              onChange={(e) => setRestoreReason(e.target.value)}
              placeholder="ระบุเหตุผลการคืนสิทธิ์บัญชี"
            />
          </Field>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ok" onClick={confirmRestore}>
              ยืนยันคืนสิทธิ์
            </Btn>

            <Btn
              kind="ghost"
              onClick={() => {
                setRestoring(null);
                setRestoreReason("");
              }}
            >
              ยกเลิก
            </Btn>
          </div>
        </Card>
      ) : null}

      <Table
        columns={[
          { key: "name", label: "ผู้ใช้", render: (u) => (<div><b>{u.name}</b><div style={{ fontSize: 11.5, color: "#5F6368" }}>{u.email}</div></div>) },
          { key: "role", label: "บทบาท", render: (u) => <Pill>{ROLE_LABEL[u.role]}</Pill> },
          { key: "status", label: "สถานะ", render: (u) => <Status value={u.status} /> },
          {
            key: "act", label: "",
            render: (u) => u.status === "active"
              ? <Btn kind="danger" onClick={() => { setSuspending(u); setReason(""); }}>ระงับบัญชี</Btn>
              : <Btn
                  kind="ok"
                  onClick={() => {
                    setRestoring(u);
                    setRestoreReason("");
                  }}
                >
                  คืนสิทธิ์
                </Btn>
          },
        ]}
        rows={rows}
      />
    </>
  );
}