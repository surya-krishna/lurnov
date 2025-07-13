import { AfterViewInit, ElementRef, ViewChild, OnDestroy, HostListener, Component } from '@angular/core';
import * as THREE from 'three';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styles: [`
    :host {
      --primary: #5f6fff;
      --accent: #a259ff;
      --cyan: #00d4ff;
      --background: #0a0a12;
      --surface1: #181a2a;
      --surface2: #23244a;
      --white: #fff;
    }
    .three-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      outline: none;
      z-index: -1;
    }
    .content-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      flex-direction: column;
      pointer-events: none;
      //background: linear-gradient(180deg, rgba(10,10,18,0.55) 0%, rgba(24,26,42,0.35) 100%);
      /* Add a subtle glass effect for hero overlay */
      //backdrop-filter: blur(2px);
    }
    .content-overlay > * {
      pointer-events: auto;
      background: rgba(24,26,42,0.15);
      border-radius: 1rem;
      box-shadow: 0 4px 32px 0 rgba(31, 38, 135, 0.17);
    }
    h1 {
      color: var(--white);
    }
    a {
      font-family: 'Inter', sans-serif;
    }
  `]
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('threeCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: THREE.Points;
  private lineSystem!: THREE.LineSegments;
  private animationId!: number;
  private mouseX = 0;
  private mouseY = 0;
  private sizes = { width: window.innerWidth, height: window.innerHeight };

  ngAfterViewInit() {
    this.initThreeJS();
    this.animate();
    window.addEventListener('resize', this.onWindowResize.bind(this));
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this));
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer?.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    document.removeEventListener('mousemove', this.onDocumentMouseMove.bind(this));
  }

  private initThreeJS() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 1000);
    this.camera.position.z = 50;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // --- PARTICLES CREATION ---
    const particleCount = 7000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color1 = new THREE.Color('#00c6ff'); // Bright Cyan
    const color2 = new THREE.Color('#0072ff'); // Bright Blue
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 25 + Math.random() * 25;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      positions[i3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i3 + 2] = radius * Math.cos(phi);
      const mixedColor = color1.clone().lerp(color2, Math.random());
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    this.particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    this.scene.add(this.particleSystem);

    // --- NEURAL NETWORK LINES CREATION ---
    const lineVertices: number[] = [];
    const connectionDistance = 6;
    const particlePositions = particlesGeometry.attributes['position'];
    for (let i = 0; i < particleCount; i++) {
      const p1 = new THREE.Vector3().fromBufferAttribute(particlePositions, i);
      let connections = 0;
      for (let j = i + 1; j < Math.min(i + 150, particleCount); j++) {
        const p2 = new THREE.Vector3().fromBufferAttribute(particlePositions, j);
        if (p1.distanceTo(p2) < connectionDistance) {
          lineVertices.push(p1.x, p1.y, p1.z);
          lineVertices.push(p2.x, p2.y, p2.z);
          connections++;
          if (connections > 2) break;
        }
      }
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial);
    this.scene.add(this.lineSystem);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    const elapsedTime = performance.now() * 0.001;
    const rotationSpeed = 0.05;
    this.particleSystem.rotation.y = elapsedTime * rotationSpeed;
    this.lineSystem.rotation.y = elapsedTime * rotationSpeed;
    this.camera.position.x += (this.mouseX * 5 - this.camera.position.x) * 0.05;
    this.camera.position.y += (-this.mouseY * 5 - this.camera.position.y) * 0.05;
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;
    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private onDocumentMouseMove(event: MouseEvent) {
    this.mouseX = (event.clientX - this.sizes.width / 2) / (this.sizes.width / 2);
    this.mouseY = (event.clientY - this.sizes.height / 2) / (this.sizes.height / 2);
  }
}