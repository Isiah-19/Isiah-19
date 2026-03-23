// ============================================
// Dynamic Wave Canvas Background
// Ported from components/ui/dynamic-wave-canvas-background.tsx
// Optimized: heavy downscale, throttled to ~20fps, pauses when tab hidden
// ============================================
(function initWaveCanvas() {
    const canvas = document.getElementById('waveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, imageData, data;
    const SCALE = 6; // heavy downscale for performance (was 2)
    const FPS = 20;
    const FRAME_INTERVAL = 1000 / FPS;
    let lastFrame = 0;
    let rafId = null;

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        width = Math.floor(canvas.width / SCALE);
        height = Math.floor(canvas.height / SCALE);
        imageData = ctx.createImageData(width, height);
        data = imageData.data;
    };

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeCanvas, 150);
    });
    resizeCanvas();

    const startTime = Date.now();

    // Lookup tables for fast trig
    const TABLE_SIZE = 1024;
    const SIN_TABLE = new Float32Array(TABLE_SIZE);
    const COS_TABLE = new Float32Array(TABLE_SIZE);
    const TWO_PI = Math.PI * 2;
    const INV_TWO_PI = 1 / TWO_PI;
    for (let i = 0; i < TABLE_SIZE; i++) {
        const angle = (i / TABLE_SIZE) * TWO_PI;
        SIN_TABLE[i] = Math.sin(angle);
        COS_TABLE[i] = Math.cos(angle);
    }

    const fastSin = (x) => SIN_TABLE[((x % TWO_PI) * INV_TWO_PI * TABLE_SIZE | 0) & 1023];
    const fastCos = (x) => COS_TABLE[((x % TWO_PI) * INV_TWO_PI * TABLE_SIZE | 0) & 1023];

    const render = (now) => {
        rafId = requestAnimationFrame(render);

        // Throttle frame rate
        if (now - lastFrame < FRAME_INTERVAL) return;
        lastFrame = now;

        const time = (Date.now() - startTime) * 0.001;
        const invH = 1 / height;
        for (let y = 0; y < height; y++) {
            const u_y = (2 * y - height) * invH;
            for (let x = 0; x < width; x++) {
                const u_x = (2 * x - width) * invH;
                let a = 0, d = 0;
                for (let i = 0; i < 4; i++) {
                    a += fastCos(i - d + time * 0.5 - a * u_x);
                    d += fastSin(i * u_y + a);
                }
                const wave = (fastSin(a) + fastCos(d)) * 0.5;
                const intensity = 0.3 + 0.4 * wave;
                const baseVal = 0.1 + 0.15 * fastCos(u_x + u_y + time * 0.3);
                const blueAccent = 0.2 * fastSin(a * 1.5 + time * 0.2);
                const purpleAccent = 0.15 * fastCos(d * 2 + time * 0.1);
                const r = Math.max(0, Math.min(1, baseVal + purpleAccent * 0.8)) * intensity;
                const g = Math.max(0, Math.min(1, baseVal + blueAccent * 0.6)) * intensity;
                const b = Math.max(0, Math.min(1, baseVal + blueAccent * 1.2 + purpleAccent * 0.4)) * intensity;
                const idx = (y * width + x) * 4;
                data[idx] = r * 255;
                data[idx + 1] = g * 255;
                data[idx + 2] = b * 255;
                data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(canvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
    };

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        } else {
            if (!rafId) { rafId = requestAnimationFrame(render); }
        }
    });

    rafId = requestAnimationFrame(render);
})();

// ============================================
// Custom Cursor
// ============================================
(function initCursor() {
    const cursor = document.getElementById('cursor');
    if (!cursor) return;

    let cursorX = 0, cursorY = 0;
    let targetX = 0, targetY = 0;

    document.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
    });

    function updateCursor() {
        cursorX += (targetX - cursorX) * 0.15;
        cursorY += (targetY - cursorY) * 0.15;
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        requestAnimationFrame(updateCursor);
    }

    updateCursor();

    // Magnetic hover for [data-magnetic] elements
    document.querySelectorAll('[data-magnetic]').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
})();

// ============================================
// Theme Toggle
// ============================================
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// ============================================
// Mobile Menu
// ============================================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    });
});

// ============================================
// Cypher Decode Effect for [data-decode] elements
// ============================================
(function initDecodeEffect() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';

    document.querySelectorAll('[data-decode]').forEach(el => {
        const original = el.textContent;
        let revealed = 0;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    observer.unobserve(el);
                    const interval = setInterval(() => {
                        let text = '';
                        for (let i = 0; i < original.length; i++) {
                            if (i < revealed) {
                                text += original[i];
                            } else {
                                text += chars[Math.floor(Math.random() * chars.length)];
                            }
                        }
                        el.textContent = text;
                        revealed += 2;
                        if (revealed > original.length) {
                            el.textContent = original;
                            clearInterval(interval);
                        }
                    }, 30);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(el);
    });

    // Decode lines with delay
    document.querySelectorAll('[data-decode-line]').forEach(el => {
        const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        setTimeout(() => {
            el.style.animationPlayState = 'running';
        }, delay);
    });
})();

// ============================================
// Counter Animation
// ============================================
function animateCounters() {
    const counters = document.querySelectorAll('.counter');

    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const start = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            counter.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        }

        requestAnimationFrame(updateCounter);
    });
}

// ============================================
// Scroll Animations
// ============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.section-header, .about-heading, .about-text p, .section-subtitle, .contact-heading, .contact-text').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});

document.querySelectorAll('.project-card, .skill-category, .contact-form').forEach((el, i) => {
    el.classList.add('scale-in');
    el.style.transitionDelay = `${i * 0.1}s`;
    observer.observe(el);
});

document.querySelectorAll('.contact-link').forEach((el, i) => {
    el.classList.add('fade-in');
    el.style.transitionDelay = `${i * 0.08}s`;
    observer.observe(el);
});

// Counter trigger
const statsSection = document.querySelector('.about-stats');
let counterAnimated = false;

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !counterAnimated) {
            counterAnimated = true;
            animateCounters();
        }
    });
}, { threshold: 0.5 });

if (statsSection) {
    counterObserver.observe(statsSection);
}

// Stat cards animation
document.querySelectorAll('.stat').forEach((el, i) => {
    el.classList.add('fade-in');
    el.style.transitionDelay = `${i * 0.15}s`;
    observer.observe(el);
});

// ============================================
// Navbar Scroll Effect
// ============================================
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ============================================
// Active Nav Link on Scroll
// ============================================
const sections = document.querySelectorAll('.section');
const navLinksAll = document.querySelectorAll('.nav-links a');

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinksAll.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}, { threshold: 0.3 });

sections.forEach(section => navObserver.observe(section));

// ============================================
// Contact Form
// ============================================
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('.btn-submit');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span>Message Sent!</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #06b6d4)';
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        contactForm.reset();
    }, 2500);
});

// ============================================
// Smooth Reveal on Page Load
// ============================================
window.addEventListener('load', () => {
    document.body.classList.remove('loading');
    document.body.style.opacity = '1';
});
