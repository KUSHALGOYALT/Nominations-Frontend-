"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, 0, 8);

    // ── Particle field ────────────────────────────────────────
    const count = 2200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x14B8A6,
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // ── Rings ─────────────────────────────────────────────────
    const ringData = [
      { radius: 3.4, tube: 0.012, color: 0x14B8A6, speed: 0.18, tiltX: 0.5,  tiltZ: 0.1  },
      { radius: 4.8, tube: 0.008, color: 0x0F766E, speed: -0.11, tiltX: -0.3, tiltZ: 0.4  },
      { radius: 6.2, tube: 0.006, color: 0x0d9488, speed: 0.07,  tiltX: 0.8,  tiltZ: -0.2 },
    ];
    const rings = ringData.map(({ radius, tube, color, tiltX, tiltZ }) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 2, 140),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
      );
      mesh.rotation.x = tiltX;
      mesh.rotation.z = tiltZ;
      scene.add(mesh);
      return mesh;
    });

    // ── Glow orb ─────────────────────────────────────────────
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x14B8A6, transparent: true, opacity: 0.14 })
    );
    scene.add(orb);

    // ── Floating icosahedra ───────────────────────────────────
    const shapeData = Array.from({ length: 9 }, () => ({
      x:     (Math.random() - 0.5) * 14,
      y:     (Math.random() - 0.5) * 10,
      z:     (Math.random() - 0.5) * 6 - 2,
      scale: 0.05 + Math.random() * 0.2,
      speed: 0.15 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
    }));
    const shapes = shapeData.map((s) => {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.18, wireframe: true })
      );
      mesh.position.set(s.x, s.y, s.z);
      mesh.scale.setScalar(s.scale);
      scene.add(mesh);
      return mesh;
    });

    // ── Mouse parallax ────────────────────────────────────────
    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Resize ────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animate ───────────────────────────────────────────────
    let frameId;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Particles slow spin
      particles.rotation.x = t * 0.04;
      particles.rotation.y = t * 0.06;

      // Rings spin individually
      ringData.forEach(({ speed }, i) => { rings[i].rotation.y = t * speed; });

      // Orb pulse
      const pulse = 1 + Math.sin(t * 1.2) * 0.08;
      orb.scale.setScalar(pulse);
      orb.material.opacity = 0.12 + Math.sin(t * 1.2) * 0.04;

      // Icosahedra float
      shapes.forEach((mesh, i) => {
        const s = shapeData[i];
        mesh.rotation.x = t * s.speed;
        mesh.rotation.y = t * s.speed * 0.7;
        mesh.position.y = s.y + Math.sin(t * 0.4 + s.phase) * 0.5;
      });

      // Camera parallax
      camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 0.4 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />;
}
