"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function CustomZoomMap({ center, zoom }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // ถ้ายังไม่มีแผนที่ ให้สร้างขึ้นมาใหม่
    if (!mapInstanceRef.current && mapContainerRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true, // 👈 เปิดใช้งานการซูมด้วยล้อเลื่อนเมาส์ตรงนี้
        dragging: true,        // เปิดใช้งานการลากเลื่อนแผนที่
        doubleClickZoom: true, // ซูมด้วยการดับเบิลคลิก
      }).setView(center, zoom);

      // เพิ่ม Tile Layer ของ OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // เคลียร์อินสแตนซ์แผนที่เมื่อคอมโพเนนต์ถูกทำลาย (Unmount)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // อัปเดตตำแหน่งศูนย์กลางและระดับซูมเมื่อ Props เปลี่ยนแปลง
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} 
    />
  );
}