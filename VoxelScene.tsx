
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { VoxelDesignResponse } from './types';

interface VoxelSceneProps {
  design: VoxelDesignResponse;
  autoRotate: boolean;
  theme: 'dark' | 'light';
}

const VoxelScene = forwardRef<{ exportScene: () => void }, VoxelSceneProps>(({ design, autoRotate, theme }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoRotateRef = useRef(autoRotate);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const voxelGroupRef = useRef<THREE.Group | null>(null);

  useImperativeHandle(ref, () => ({
    exportScene: () => {
      if (!voxelGroupRef.current) return;
      
      const exporter = new GLTFExporter();
      exporter.parse(
        voxelGroupRef.current,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${design.name.toLowerCase().replace(/\s+/g, '_')}_voxel.glb`;
          link.click();
          URL.revokeObjectURL(url);
        },
        (error) => {
          console.error('An error happened during glTF export:', error);
        },
        { binary: true }
      );
    }
  }));

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;
    // Ensure strict-mode remounts never leave multiple canvases attached.
    while (mountEl.firstChild) {
      mountEl.removeChild(mountEl.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; 

    const camera = new THREE.PerspectiveCamera(35, mountEl.clientWidth / mountEl.clientHeight, 0.1, 1000);
    camera.position.set(70, 60, 70);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true, 
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountEl.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.7;
    controlsRef.current = controls;

    // Theme-specific values
    const lightIntensity = theme === 'dark' ? 2.5 : 1.8;
    const rimIntensity = theme === 'dark' ? 1.0 : 0.5;
    const gridColor1 = theme === 'dark' ? 0x4f46e5 : 0x6366f1;
    const gridColor2 = theme === 'dark' ? 0x1e293b : 0xe2e8f0;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, theme === 'dark' ? 0.6 : 0.8);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    mainLight.position.set(50, 100, 50);
    mainLight.castShadow = true;
    mainLight.shadow.bias = -0.00002;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xe0e7ff, rimIntensity);
    rimLight.position.set(-60, 40, -60);
    scene.add(rimLight);

    const fillLight = new THREE.HemisphereLight(0xffffff, 0x1e1b4b, 0.4);
    scene.add(fillLight);

    // Ground Grid
    const gridHelper = new THREE.GridHelper(160, 80, gridColor1, gridColor2);
    gridHelper.position.y = -25.01;
    scene.add(gridHelper);

    // Voxel Group
    const group = new THREE.Group();
    voxelGroupRef.current = group;
    const materialCache = new Map<string, THREE.MeshStandardMaterial>();

    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: theme === 'dark' ? 0x000000 : 0x333333, 
      transparent: true, 
      opacity: theme === 'dark' ? 0.15 : 0.1,
      depthWrite: false 
    });

    design.clusters.forEach((cluster) => {
      const geometry = new THREE.BoxGeometry(cluster.w, cluster.h, cluster.d);
      
      let material = materialCache.get(cluster.color);
      if (!material) {
        material = new THREE.MeshStandardMaterial({ 
          color: cluster.color,
          roughness: 0.9,
          metalness: 0.0,
          flatShading: true,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1
        });
        materialCache.set(cluster.color, material);
      }
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Number(cluster.x.toFixed(4)), 
        Number(cluster.y.toFixed(4)), 
        Number(cluster.z.toFixed(4))
      );
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(geometry);
      const outline = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(outline);

      group.add(mesh);
    });

    scene.add(group);

    // Centering
    const bbox = new THREE.Box3().setFromObject(group);
    const center = bbox.getCenter(new THREE.Vector3());
    const snappedOffsetX = Math.round(center.x * 2) / 2;
    const snappedOffsetZ = Math.round(center.z * 2) / 2;

    group.position.x = -snappedOffsetX;
    group.position.z = -snappedOffsetZ;
    group.position.y = -bbox.min.y - 25;

    const handleResize = () => {
      camera.aspect = mountEl.clientWidth / mountEl.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current;
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      controls.dispose();
      if (mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
      
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m: THREE.Material) => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      
      materialCache.forEach(m => m.dispose());
      lineMaterial.dispose();
      renderer.dispose();
      controlsRef.current = null;
      sceneRef.current = null;
      voxelGroupRef.current = null;
    };
  }, [design, theme]);

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
});

export default VoxelScene;
