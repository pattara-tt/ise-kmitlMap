"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { isEventVisible } from "./mapViewHelpers";

export function useEventInterest(user) {
  const [events, setEvents] = useState([]);
  const [interests, setInterests] = useState([]);
  const [eventCard, setEventCard] = useState(null);

  const reloadEvents = useCallback(async () => {
    try {
      const [eventResponse, interestResponse] = await Promise.all([
        apiFetch("/api/data/events"),
        apiFetch("/api/data/eventInterest"),
      ]);
      setEvents((eventResponse.items || []).filter((event) => event.published && isEventVisible(event)));
      setInterests(interestResponse.items || []);
    } catch {
      // The map remains usable if event data is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    reloadEvents();
  }, [reloadEvents]);

  const myInterest = (eventId) =>
    interests.find((interest) => interest.eventId === eventId && interest.userId === user?.id);

  const toggleInterest = async (event) => {
    if (!user?.id) return alert("กรุณาเข้าสู่ระบบก่อนกดสนใจกิจกรรม");
    const mine = myInterest(event.id);
    if (mine) {
      await apiFetch(
        `/api/data/eventInterest?id=${encodeURIComponent(
          JSON.stringify({ userId: mine.userId, eventId: mine.eventId })
        )}`,
        { method: "DELETE" }
      );
    } else {
      await apiFetch("/api/data/eventInterest", {
        method: "POST",
        body: { eventId: event.id, userId: user.id },
      });
    }
    await reloadEvents();
  };

  return { events, interests, eventCard, setEventCard, myInterest, toggleInterest };
}
