(function () {
    'use strict';

    // ===== CONFIG =====
    const CFG = {
        groundRatio: 0.18,
        starCount: 250,
        rainCount: 450,
        carCount: 10,
        steamCount: 35,
        lightningChance: 0.0008,
        layers: [
            { count: 50, minH: 60, maxH: 220, minW: 12, maxW: 45, opacity: 0.3, winSize: 2, winGap: 6, signChance: 0 },
            { count: 30, minH: 100, maxH: 380, minW: 22, maxW: 75, opacity: 0.6, winSize: 3, winGap: 8, signChance: 0.15 },
            { count: 20, minH: 160, maxH: 520, minW: 35, maxW: 120, opacity: 1.0, winSize: 4, winGap: 10, signChance: 0.45 }
        ],
        neonColors: ['#ff006e', '#00f5ff', '#b829dd', '#39ff14', '#ffd700', '#ff0040', '#ff69b4', '#00ffcc'],
        windowColors: ['#ffa500', '#ff8c00', '#ffcc00', '#ffe4b5', '#ffffff', '#e0e0ff', '#00ccff', '#ff69b4', '#7b68ee'],
        buildingColors: ['#0c0c1e', '#0e0e22', '#111128', '#0d0d1a', '#131332', '#0f0f24', '#10102a', '#0b0b1c'],
        signTexts: ['ネオン', 'CYBER', '2077', '酒場', 'HACK', 'DATA', 'バー', 'NEON', '電脳', 'VOID',
            'PUNK', 'ZERO', 'テック', 'BYTE', 'CODE', '未来', 'DARK', 'NET', 'SYNTH', '夜']
    };

    // ===== UTILS =====
    const rand = (a, b) => Math.random() * (b - a) + a;
    const randInt = (a, b) => Math.floor(rand(a, b + 1));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const hex2rgb = hex => ({
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    });

    // ===== STAR =====
    class Star {
        constructor(W, H) {
            this.x = rand(0, W);
            this.y = rand(0, H * 0.45);
            this.s = rand(0.5, 1.8);
            this.br = rand(0.3, 1);
            this.sp = rand(0.5, 3);
            this.ph = rand(0, 6.28);
        }
        draw(ctx, t) {
            const a = this.br * (0.5 + 0.5 * Math.sin(t * this.sp + this.ph));
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.fillRect(this.x, this.y, this.s, this.s);
        }
    }

    // ===== BUILDING =====
    class Building {
        constructor(x, w, h, layer, groundY) {
            this.x = x; this.w = w; this.h = h;
            this.groundY = groundY;
            this.color = pick(CFG.buildingColors);
            this.op = layer.opacity;

            // Windows
            this.wins = [];
            const ws = layer.winSize, wg = layer.winGap;
            const wh = ws * 1.5;
            const cols = Math.floor((w - 8) / wg);
            const rows = Math.floor((h - 15) / (wh + 4));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    this.wins.push({
                        rx: 4 + c * wg, ry: 8 + r * (wh + 4),
                        w: ws, h: wh,
                        lit: Math.random() > 0.35,
                        flicker: Math.random() < 0.05,
                        ph: rand(0, 6.28),
                        col: pick(CFG.windowColors)
                    });
                }
            }

            // Neon signs
            this.signs = [];
            if (Math.random() < layer.signChance) {
                const n = randInt(1, 2);
                for (let i = 0; i < n; i++) {
                    const sh = randInt(14, 28);
                    const sw = Math.min(w - 6, randInt(28, 65));
                    this.signs.push({
                        rx: rand(3, w - sw - 3), ry: rand(12, h * 0.55),
                        w: sw, h: sh,
                        text: pick(CFG.signTexts),
                        col: pick(CFG.neonColors),
                        ph: rand(0, 6.28), sp: rand(1, 4),
                        flicker: Math.random() < 0.15
                    });
                }
            }

            // Rooftop
            this.roofType = pick(['none', 'antenna', 'antenna', 'light', 'light', 'block']);
            this.roofCol = pick(CFG.neonColors);
            this.roofPh = rand(0, 6.28);
            this.edgeCol = `rgba(70,70,120,${0.2 * this.op})`;
        }

        draw(ctx, t, simple) {
            const bx = this.x, by = this.groundY - this.h;
            ctx.globalAlpha = this.op;
            ctx.fillStyle = this.color;
            ctx.fillRect(bx, by, this.w, this.h);

            if (simple) { // reflection mode — only windows
                for (const wi of this.wins) {
                    if (!wi.lit) continue;
                    ctx.globalAlpha = 0.06 * this.op;
                    ctx.fillStyle = wi.col;
                    ctx.fillRect(bx + wi.rx, by + wi.ry, wi.w, wi.h);
                }
                ctx.globalAlpha = 1;
                return;
            }

            // Edge
            ctx.strokeStyle = this.edgeCol;
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, this.w - 1, this.h - 1);

            // Windows
            for (const wi of this.wins) {
                if (!wi.lit) continue;
                let a = 1;
                if (wi.flicker) a = 0.3 + 0.7 * Math.abs(Math.sin(t * 8 + wi.ph));
                ctx.globalAlpha = this.op * a;
                const rgb = hex2rgb(wi.col);
                ctx.fillStyle = wi.col;
                ctx.shadowBlur = wi.w * 1.5;
                ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
                ctx.fillRect(bx + wi.rx, by + wi.ry, wi.w, wi.h);
            }
            ctx.shadowBlur = 0;

            // Neon signs
            for (const s of this.signs) {
                let glow = 0.7 + 0.3 * Math.sin(t * s.sp + s.ph);
                if (s.flicker && Math.sin(t * 15 + s.ph) > 0.8) glow = 0.1;
                ctx.globalAlpha = this.op * glow;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(bx + s.rx, by + s.ry, s.w, s.h);
                ctx.shadowBlur = 10;
                ctx.shadowColor = s.col;
                ctx.strokeStyle = s.col;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bx + s.rx, by + s.ry, s.w, s.h);
                ctx.shadowBlur = 15;
                ctx.fillStyle = s.col;
                ctx.font = `${Math.min(s.h - 6, 13)}px 'Orbitron',monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(s.text, bx + s.rx + s.w / 2, by + s.ry + s.h / 2, s.w - 4);
                ctx.shadowBlur = 0;
            }

            // Rooftop
            ctx.globalAlpha = this.op;
            const cx = bx + this.w / 2;
            if (this.roofType === 'antenna') {
                ctx.strokeStyle = '#333355';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, by - 18); ctx.stroke();
                const bl = Math.sin(t * 3 + this.roofPh) > 0.5 ? 1 : 0.1;
                ctx.globalAlpha = this.op * bl;
                ctx.fillStyle = this.roofCol;
                ctx.shadowBlur = 8; ctx.shadowColor = this.roofCol;
                ctx.beginPath(); ctx.arc(cx, by - 18, 2, 0, 6.28); ctx.fill();
                ctx.shadowBlur = 0;
            } else if (this.roofType === 'light') {
                const bl = Math.sin(t * 2 + this.roofPh) > 0.3 ? 0.8 : 0.2;
                ctx.globalAlpha = this.op * bl;
                ctx.fillStyle = '#ff0040';
                ctx.shadowBlur = 6; ctx.shadowColor = '#ff0040';
                ctx.beginPath(); ctx.arc(cx, by + 3, 2, 0, 6.28); ctx.fill();
                ctx.shadowBlur = 0;
            } else if (this.roofType === 'block') {
                ctx.fillStyle = pick(CFG.buildingColors);
                const bw = this.w * 0.4, bh = randInt(8, 25);
                ctx.fillRect(bx + (this.w - bw) / 2, by - bh, bw, bh);
            }
            ctx.globalAlpha = 1;
        }
    }

    // ===== FLYING CAR =====
    class FlyingCar {
        constructor(W, gY) { this.W = W; this.gY = gY; this.reset(true); }
        reset(init) {
            this.dir = Math.random() > 0.5 ? 1 : -1;
            this.x = init ? rand(0, this.W) : (this.dir === 1 ? -50 : this.W + 50);
            this.y = rand(this.gY * 0.08, this.gY * 0.55);
            this.spd = rand(80, 200);
            this.sz = rand(3, 6);
            this.col = pick(CFG.neonColors);
            this.trail = [];
            this.tLen = randInt(15, 30);
        }
        update(dt) {
            this.x += this.spd * this.dir * dt;
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.tLen) this.trail.shift();
            if ((this.dir === 1 && this.x > this.W + 80) || (this.dir === -1 && this.x < -80)) this.reset();
        }
        draw(ctx) {
            for (let i = 0; i < this.trail.length; i++) {
                const a = (i / this.trail.length) * 0.4;
                const s = this.sz * 0.3 * (i / this.trail.length);
                ctx.fillStyle = `rgba(255,0,64,${a})`;
                ctx.fillRect(this.trail[i].x - s / 2, this.trail[i].y - s / 2, s, s);
            }
            ctx.fillStyle = this.col;
            ctx.shadowBlur = 10; ctx.shadowColor = this.col;
            ctx.fillRect(this.x - this.sz, this.y - this.sz / 2, this.sz * 2, this.sz);
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
            const hlx = this.dir === 1 ? this.x + this.sz : this.x - this.sz;
            ctx.beginPath(); ctx.arc(hlx, this.y, this.sz * 0.35, 0, 6.28); ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // ===== RAIN DROP =====
    class RainDrop {
        constructor(W, H) { this.W = W; this.H = H; this.reset(true); }
        reset(init) {
            this.x = rand(-50, this.W + 50);
            this.y = init ? rand(0, this.H) : rand(-100, -10);
            this.len = rand(10, 22);
            this.spd = rand(400, 750);
            this.wind = rand(30, 70);
            this.a = rand(0.08, 0.25);
        }
        update(dt) {
            this.y += this.spd * dt;
            this.x += this.wind * dt;
            if (this.y > this.H) this.reset();
        }
        draw(ctx) {
            ctx.strokeStyle = `rgba(180,200,255,${this.a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.wind * 0.03, this.y + this.len);
            ctx.stroke();
        }
    }

    // ===== STEAM =====
    class Steam {
        constructor(ox, oy) { this.ox = ox; this.oy = oy; this.reset(true); }
        reset(init) {
            this.x = this.ox + rand(-4, 4);
            this.y = init ? this.oy - rand(0, 40) : this.oy;
            this.sz = rand(2, 6);
            this.spd = rand(15, 40);
            this.life = init ? rand(0, 3) : 0;
            this.max = rand(2, 4.5);
            this.a = rand(0.03, 0.1);
            this.dr = rand(-8, 8);
        }
        update(dt) {
            this.y -= this.spd * dt;
            this.x += this.dr * dt;
            this.sz += dt * 2.5;
            this.life += dt;
            if (this.life > this.max) this.reset();
        }
        draw(ctx) {
            const p = this.life / this.max;
            ctx.fillStyle = `rgba(140,150,190,${this.a * (1 - p)})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.sz, 0, 6.28); ctx.fill();
        }
    }

    // ===== MAIN CITY ENGINE =====
    class CyberpunkCity {
        constructor(canvas) {
            this.cvs = canvas;
            this.ctx = canvas.getContext('2d');
            this.W = 0; this.H = 0; this.gY = 0;
            this.time = 0;
            this.lightAlpha = 0;
            this.showRain = true;
            this.showCars = true;
            this.showReflect = true;
            this.layers = [[], [], []];
            this.stars = [];
            this.cars = [];
            this.rain = [];
            this.steam = [];
            this.resize();
            this.generate();
            this.bindUI();
            window.addEventListener('resize', () => { this.resize(); this.generate(); });
        }

        resize() {
            this.W = this.cvs.width = window.innerWidth;
            this.H = this.cvs.height = window.innerHeight;
            this.gY = Math.floor(this.H * (1 - CFG.groundRatio));
        }

        generate() {
            const W = this.W, H = this.H, gY = this.gY;

            this.stars = Array.from({ length: CFG.starCount }, () => new Star(W, H));

            this.layers = CFG.layers.map(layer => {
                const arr = [];
                for (let i = 0; i < layer.count; i++) {
                    const w = rand(layer.minW, layer.maxW);
                    const h = rand(layer.minH, layer.maxH);
                    arr.push(new Building(rand(-w, W), w, h, layer, gY));
                }
                return arr.sort((a, b) => a.x - b.x);
            });

            this.cars = Array.from({ length: CFG.carCount }, () => new FlyingCar(W, gY));
            this.rain = Array.from({ length: CFG.rainCount }, () => new RainDrop(W, H));
            this.steam = [];
            const near = this.layers[2];
            for (let i = 0; i < CFG.steamCount; i++) {
                const b = pick(near);
                if (b) this.steam.push(new Steam(b.x + rand(0, b.w), gY - b.h));
            }
            this.updateStats();
        }

        bindUI() {
            const $ = id => document.getElementById(id);
            $('btn-regenerate').onclick = () => { this.generate(); this.flash(); };
            $('btn-rain').onclick = e => { this.showRain = !this.showRain; e.currentTarget.classList.toggle('active'); };
            $('btn-cars').onclick = e => { this.showCars = !this.showCars; e.currentTarget.classList.toggle('active'); };
            $('btn-reflections').onclick = e => { this.showReflect = !this.showReflect; e.currentTarget.classList.toggle('active'); };
            $('btn-screenshot').onclick = () => this.screenshot();
            document.addEventListener('keydown', e => {
                if (e.code === 'Space') { e.preventDefault(); this.generate(); this.flash(); }
            });
        }

        flash() {
            const el = document.createElement('div');
            el.className = 'flash-overlay';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 500);
        }

        screenshot() {
            const a = document.createElement('a');
            a.download = `cyberpunk-${Date.now()}.png`;
            a.href = this.cvs.toDataURL('image/png');
            a.click();
        }

        updateStats() {
            let nb = 0, ns = 0;
            for (const l of this.layers) for (const b of l) { nb++; ns += b.signs.length; }
            document.getElementById('stat-buildings').textContent = nb;
            document.getElementById('stat-signs').textContent = ns;
            document.getElementById('stat-cars').textContent = this.cars.length;
        }

        update(dt) {
            this.time += dt;
            if (this.showCars) this.cars.forEach(c => c.update(dt));
            if (this.showRain) this.rain.forEach(r => r.update(dt));
            this.steam.forEach(s => s.update(dt));
            if (this.showRain && Math.random() < CFG.lightningChance) this.lightAlpha = rand(0.25, 0.7);
            if (this.lightAlpha > 0) { this.lightAlpha -= dt * 3; if (this.lightAlpha < 0) this.lightAlpha = 0; }
        }

        render() {
            const ctx = this.ctx, W = this.W, H = this.H;
            ctx.clearRect(0, 0, W, H);

            // Sky
            const sky = ctx.createLinearGradient(0, 0, 0, this.gY);
            sky.addColorStop(0, '#020210');
            sky.addColorStop(0.3, '#050520');
            sky.addColorStop(0.6, '#0a0a30');
            sky.addColorStop(0.85, '#150a35');
            sky.addColorStop(1, '#1a0a2e');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, W, this.gY);

            // Horizon glow
            const hg = ctx.createRadialGradient(W * 0.5, this.gY, 0, W * 0.5, this.gY, W * 0.55);
            hg.addColorStop(0, 'rgba(100,20,80,0.12)');
            hg.addColorStop(0.6, 'rgba(40,10,50,0.04)');
            hg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = hg;
            ctx.fillRect(0, 0, W, this.gY);

            // Stars
            this.stars.forEach(s => s.draw(ctx, this.time));

            // Buildings
            for (const l of this.layers) for (const b of l) b.draw(ctx, this.time, false);

            // Flying cars
            if (this.showCars) this.cars.forEach(c => c.draw(ctx));

            // Steam
            this.steam.forEach(s => s.draw(ctx));

            // Reflections or dark ground
            if (this.showReflect) {
                this.drawReflections();
            } else {
                ctx.fillStyle = '#030308';
                ctx.fillRect(0, this.gY, W, H - this.gY);
            }

            // Rain
            if (this.showRain) this.rain.forEach(r => r.draw(ctx));

            // Fog
            const fog = ctx.createLinearGradient(0, this.gY - 70, 0, this.gY + 15);
            fog.addColorStop(0, 'rgba(10,10,40,0)');
            fog.addColorStop(0.6, 'rgba(15,10,35,0.12)');
            fog.addColorStop(1, 'rgba(10,5,25,0.25)');
            ctx.fillStyle = fog;
            ctx.fillRect(0, this.gY - 70, W, 85);

            // Lightning
            if (this.lightAlpha > 0) {
                ctx.fillStyle = `rgba(200,200,255,${this.lightAlpha * 0.25})`;
                ctx.fillRect(0, 0, W, H);
            }
        }

        drawReflections() {
            const ctx = this.ctx, W = this.W, H = this.H, gY = this.gY;
            const groundH = H - gY;
            ctx.fillStyle = '#030308';
            ctx.fillRect(0, gY, W, groundH);

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, gY, W, groundH);
            ctx.clip();
            ctx.translate(0, gY * 2);
            ctx.scale(1, -1);
            ctx.globalAlpha = 0.1;
            for (const l of this.layers) for (const b of l) b.draw(ctx, this.time, true);
            ctx.restore();

            // Water overlay
            const wg = ctx.createLinearGradient(0, gY, 0, H);
            wg.addColorStop(0, 'rgba(5,5,20,0.25)');
            wg.addColorStop(0.4, 'rgba(5,5,20,0.55)');
            wg.addColorStop(1, 'rgba(3,3,10,0.92)');
            ctx.fillStyle = wg;
            ctx.fillRect(0, gY, W, groundH);

            // Ripples
            ctx.strokeStyle = 'rgba(80,100,160,0.035)';
            ctx.lineWidth = 1;
            for (let y = gY + 4; y < H; y += randInt(3, 7)) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            }
        }

        start() {
            let last = performance.now();
            const loop = (now) => {
                const dt = Math.min((now - last) / 1000, 0.05);
                last = now;
                this.update(dt);
                this.render();
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }
    }

    // ===== BOOT =====
    window.addEventListener('DOMContentLoaded', () => {
        const city = new CyberpunkCity(document.getElementById('city-canvas'));
        city.start();
    });
})();
