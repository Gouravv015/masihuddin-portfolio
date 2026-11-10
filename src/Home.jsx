import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import BookShelf from './components/BookShelf.jsx';
import BorderGlow from './components/BorderGlow.jsx';
import CursorFollower from './components/CursorFollower.jsx';
import FlipText from './components/FlipText.jsx';
import Journey from './components/Journey.jsx';
import ReachOut from './components/ReachOut.jsx';
import { createDissolve } from './components/dissolve.js';
import { MusicToggleButton } from './components/MusicToggleButton.jsx';
import ProfileCard from './components/ProfileCard.jsx';
import ScrollReveal from './components/ScrollReveal.jsx';
import StaggeredMenu from './components/StaggeredMenu.jsx';
import TiltedCard from './components/TiltedCard.jsx';
import WorkWall from './components/WorkWall.jsx';
import logo from './assets/logo.svg';
import { CONTENT } from './content.js';
import { DOT, GLYPH, HOOK_PATH } from './preloader/glyph.js';
import './home.css';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const MENU_ITEMS = [
  { label: 'Home', ariaLabel: 'Go to the top of the page', link: '#home' },
  { label: 'About', ariaLabel: 'Go to about', link: '#about' },
  { label: 'Work', ariaLabel: 'Go to selected work', link: '#projects' },
  { label: 'Skills', ariaLabel: 'Go to skills', link: '#skills' },
  { label: 'Journey', ariaLabel: 'Go to journey', link: '#journey' },
  { label: 'Contact', ariaLabel: 'Go to contact', link: '#contact' },
];

const pad = (n) => String(n).padStart(2, '0');
const REAL_PROJECTS = CONTENT.projects.filter((project) => !project.soon);

export default function Home({ inert }) {
  const rootRef = useRef(null);
  const lenisRef = useRef(null); // the smooth-scroll engine, for buttons that scroll the page

  // Starts once the preloader is gone, so the entrance plays as the page is revealed.
  useLayoutEffect(() => {
    if (inert || REDUCED_MOTION) return undefined;
    const cleanups = [];

    // Smooth scroll: Lenis eases the browser's own scroll (the page itself is never moved), ticked by GSAP so
    // ScrollTrigger and every animation stay in step. Touch keeps fully native scrolling.
    // Start at the top on every load: ScrollTrigger otherwise restores the last scroll spot on reload.
    ScrollTrigger.clearScrollMemory('manual');
    window.scrollTo(0, 0);
    const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 1 }); // glide measured to match yucca.co.za
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tickLenis = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tickLenis);
    gsap.ticker.lagSmoothing(0);
    cleanups.push(() => {
      gsap.ticker.remove(tickLenis);
      lenis.destroy();
      lenisRef.current = null;
    });

    const context = gsap.context(() => {
      const lastName = SplitText.create('.home__last-name', {
        type: 'chars',
        mask: 'chars',
      });
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from(lastName.chars, { yPercent: 110, duration: 1.2, stagger: 0.045 })
        .from('.home__first-name', { yPercent: 100, autoAlpha: 0, duration: 0.9 }, 0.35);

      // Photo scene, one continuous shared-element move: the photo becomes the profile card's picture.
      //   1. It scrolls in with section 2 until it fills the window, and holds there for a full screen.
      //   2. It shrinks with a little parallax inside the frame and lands exactly on the card's picture, which is
      //      scrolling up with the page, so it settles into moving content rather than an empty box. On the way,
      //      the black-and-white photo burns away from its centre (WebGL dissolve) into the same photo in colour.
      //   3. The card builds itself around the landed picture: its frame grows out from the picture's edges, then
      //      the name and footer rise in.
      // The photo element is window-sized and only ever scaled down (always sharp); only transforms, opacity and
      // clip-paths change, so it stays smooth.
      const photo = document.querySelector('.about__photo');
      const photoImg = photo?.querySelector('img');
      const photoSlot = document.querySelector('.about__photo-slot');
      const card = document.querySelector('.about__card');
      const tile = card?.querySelector('.profile-card__tile');
      const cardText = card ? gsap.utils.toArray(card.querySelectorAll('.profile-card__footer')) : [];
      const photoCanvas = document.querySelector('.about__photo-canvas');
      const scene = document.querySelector('.photo-scene');
      const main = document.querySelector('#smooth-content main');
      if (photo && photoImg && photoCanvas && photoSlot && card && tile && scene && main) {
        photo.classList.add('about__photo--flying');
        scene.classList.add('photo-scene--on');
        // The canvas draws the photo so it can dissolve; without WebGL the plain black-and-white photo flies.
        const dissolve = createDissolve(photoCanvas, CONTENT.portrait);
        if (dissolve) {
          photo.classList.add('about__photo--webgl');
          dissolve.resize(); // measure now that the canvas is shown
        }
        const layer = dissolve ? photoCanvas : photoImg; // what carries the parallax
        const onResize = () => dissolve?.resize();
        window.addEventListener('resize', onResize);
        cleanups.push(() => {
          window.removeEventListener('resize', onResize);
          dissolve?.destroy();
          photo.classList.remove('about__photo--flying', 'about__photo--webgl');
          scene.classList.remove('photo-scene--on');
          [card, photo, photoImg, photoCanvas, ...cardText].forEach((el) => el?.removeAttribute('style'));
        });
        let g;
        const measure = () => {
          const m = main.getBoundingClientRect();
          const rel = (el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left - m.left, top: r.top - m.top, width: r.width, height: r.height };
          };
          const vh = window.innerHeight;
          const slot = rel(photoSlot);
          const pic = rel(tile); // the card's picture: where the photo lands
          const cardBox = rel(card);
          const fills = scene.getBoundingClientRect().top - m.top; // scroll at which it fills the window
          // Land with the whole card on screen, a little below centre, so it stays fully in view while it
          // builds over the next third of a screen of scrolling (it rises with the page as it does).
          const landAt = cardBox.top - ((vh - cardBox.height) / 2 + vh * 0.12);
          const end = landAt + vh * 0.3; // scroll at which the card is finished
          return {
            vh,
            W: window.innerWidth,
            slot,
            pic,
            // How far the card's frame reaches past its picture on each side, for growing it out.
            grow: {
              top: pic.top - cardBox.top,
              right: cardBox.left + cardBox.width - (pic.left + pic.width),
              bottom: cardBox.top + cardBox.height - (pic.top + pic.height),
              left: pic.left - cardBox.left,
            },
            fills,
            shrinkFrom: fills + vh, // holds full screen for one whole screen of scrolling
            landAt,
            end,
          };
        };
        // Same entrance as the hero name: each letter rises out of its own mask.
        const cardName = SplitText.create(card.querySelectorAll('.profile-card__name, .profile-card__title'), {
          type: 'words,chars', // words keep the line breaks between whole words
          mask: 'chars',
        });
        const nameIn = gsap
          .timeline({ paused: true, defaults: { ease: 'expo.out' } })
          .from(cardName.chars, { yPercent: 110, duration: 1.1, stagger: 0.03 });
        let nameShown = false;
        cleanups.push(() => cardName.revert());
        const travelEase = gsap.parseEase('sine.inOut');
        const buildEase = gsap.parseEase('power3.out');
        const update = (progress) => {
          const { vh, W, slot, pic, grow, fills, shrinkFrom, landAt, end } = g;
          const t = progress * end; // current scroll
          const q = t <= shrinkFrom ? 0 : Math.min(1, (t - shrinkFrom) / (landAt - shrinkFrom));
          const p = travelEase(q);
          // Where the card's picture will be on screen at the landing; the frame travels there in screen terms so
          // it never leaves the view, then rides up with the page like everything else.
          const landScreenTop = pic.top - landAt;
          const screenTop = t <= shrinkFrom ? Math.max(fills, t) - t : landScreenTop * p;
          const width = W + (pic.width - W) * p;
          const centre = W / 2 + (pic.left + pic.width / 2 - W / 2) * p;
          const box = {
            left: centre - width / 2,
            top: t >= landAt ? pic.top : t + screenTop, // after landing it sits in the page and scrolls with it
            width,
            height: vh + (pic.height - vh) * p,
          };
          const scale = Math.max(box.width / W, box.height / vh); // covers the frame, never stretched
          const insetX = ((1 - box.width / (scale * W)) / 2) * 100;
          const insetY = ((1 - box.height / (scale * vh)) / 2) * 100;
          const radius = (16 * p) / scale; // grows into the card picture's rounded corners
          const build = t <= landAt ? 0 : Math.min(1, (t - landAt) / (end - landAt));
          // Hand-off: once landed, the card's own picture (same crop) takes over under a short cross-fade.
          const handoff = Math.min(1, build / 0.15);
          // Written straight to style every frame: cheaper than a GSAP tween per frame (no parsing or unit work).
          const px = box.left - slot.left - scale * W * (insetX / 100);
          const py = box.top - slot.top - scale * vh * (insetY / 100);
          photo.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${scale})`;
          photo.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${radius}px)`;
          photo.style.opacity = 1 - handoff;
          photo.style.visibility = handoff >= 1 ? 'hidden' : '';
          // Parallax: mid-flight the photo zooms slightly and drifts slower than the frame; it's back to normal by
          // the landing so the crop matches the card's picture exactly.
          const mid = Math.sin(Math.PI * q);
          layer.style.transform = `translate3d(0, ${6 * mid}%, 0) scale(${1 + 0.14 * mid})`;
          // Dissolve: from a third of the way to near the landing, black and white burns into colour.
          dissolve?.render(gsap.utils.clamp(0, 1, (q - 0.3) / 0.6), [
            box.width / (scale * W),
            box.height / (scale * vh),
          ]);

          // The card: hidden until the landing, then its frame grows out from the picture's edges.
          const k = 1 - buildEase(Math.min(1, build / 0.7));
          card.style.visibility = t >= landAt ? '' : 'hidden';
          card.style.clipPath = `inset(${grow.top * k}px ${grow.right * k}px ${grow.bottom * k}px ${grow.left * k}px round ${16 + 10 * (1 - k)}px)`;
          // The name and title rise in letter by letter, like MASIHUDDIN; then the footer.
          if (build > 0.3 !== nameShown) {
            nameShown = !nameShown;
            if (nameShown) nameIn.play();
            else nameIn.reverse();
          }
          cardText.forEach((el, i) => {
            const r = gsap.utils.clamp(0, 1, (build - 0.3 - i * 0.15) / 0.4);
            el.style.opacity = r;
            el.style.visibility = r > 0 ? '' : 'hidden';
            el.style.transform = `translate3d(0, ${14 * (1 - buildEase(r))}px, 0)`;
          });
        };
        ScrollTrigger.create({
          trigger: main,
          start: 'top top',
          end: () => {
            g = measure();
            return `+=${g.end}`;
          },
          onUpdate: (self) => update(self.progress),
          onRefresh: (self) => update(self.progress),
        });
      }

      // The name drifts up and dims as you scroll past it, handing off to the page.
      gsap.to('.home__title', {
        yPercent: -18,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: '.home__hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      // "What I've done" and "Let's talk" sit on the outside of a cylinder lying on its side. The line level with the
      // middle of the screen faces you; scrolling rolls the cylinder up, so lines curve away over the top and come up
      // from below.
      const rollOnDrum = (heading) => {
        if (!heading) return;
        const headingLines = [...heading.children];
        let headingOnScreen = false;
        let lastTop = NaN;
        ScrollTrigger.create({
          trigger: heading,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => (headingOnScreen = self.isActive),
        });
        const rollHeading = () => {
          if (!headingOnScreen) return;
          const top = heading.getBoundingClientRect().top;
          if (top === lastTop) return;
          lastTop = top;
          // Bigger than half the screen, so a line rolls off the top edge (and up from the bottom) before it
          // reaches the top of the drum: it leaves by moving, not by fading.
          const radius = window.innerHeight * 0.62;
          headingLines.forEach((line) => {
            const flat = top + line.offsetTop + line.offsetHeight / 2 - window.innerHeight / 2;
            const raw = flat / radius;
            const angle = gsap.utils.clamp(-1.55, 1.55, raw);
            const y = radius * Math.sin(angle) - flat;
            const z = radius * Math.cos(angle) - radius;
            line.style.transform = `perspective(1200px) translate3d(0, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateX(${(-angle).toFixed(4)}rad)`;
            // Shading only: a line dims a little as it turns away. Past the top of the drum it's on the far side.
            line.style.opacity = Math.abs(raw) > 1.5 ? '0' : (0.35 + 0.65 * Math.cos(angle)).toFixed(3);
          });
        };
        gsap.ticker.add(rollHeading);
        cleanups.push(() => gsap.ticker.remove(rollHeading));
      };
      rollOnDrum(document.querySelector('.work__heading'));

      // Gallery: the section pins while the project strip slides across; WorkWall bends both onto a cylinder.
      const reel = document.querySelector('.work-reel');
      const strip = document.querySelector('.work-reel__strip');
      if (reel && strip) {
        // No dead scroll at either end: it starts with the first card already a third of the way in from the
        // right edge, and ends the moment the last card has left on the left.
        const cards = strip.children;
        const startX = () => {
          const first = cards[0];
          return window.innerWidth - first.offsetLeft - first.offsetWidth / 3;
        };
        const endX = () => {
          const last = cards[cards.length - 1];
          return -(last.offsetLeft + last.offsetWidth);
        };
        gsap.fromTo(
          strip,
          { x: startX },
          {
            x: endX,
            ease: 'none',
            scrollTrigger: {
              trigger: reel,
              start: 'top top',
              end: () => `+=${startX() - endX()}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          },
        );
      }

      // "What I bring": once it fills the screen it pins, and as you keep scrolling the lines drift apart:
      // WHAT to the right, I to the right at half the speed, BRING to the left as fast as WHAT.
      const bring = document.querySelector('.bring');
      if (bring) {
        const [what, i, brings] = bring.querySelectorAll('.bring__line');
        // How far a word must travel (right: 1, left: -1) to end with about a fifth of it past the screen edge.
        const pastEdge = (el, dir) => {
          const r = el.getBoundingClientRect();
          const gx = Number(gsap.getProperty(el, 'x')) || 0; // measure from where it sits before moving
          const left = r.left - gx;
          return dir > 0 ? window.innerWidth - (left + r.width) + r.width * 0.2 : -(left + r.width * 0.2);
        };
        gsap
          .timeline({
            defaults: { ease: 'none', force3D: true },
            scrollTrigger: {
              trigger: bring,
              start: 'top top',
              end: () => `+=${window.innerHeight * 1.5}`,
              pin: true,
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          .to(what, { x: () => pastEdge(what, 1) }, 0)
          .to(i, { x: () => pastEdge(what, 1) / 2 }, 0)
          .to(brings, { x: () => pastEdge(brings, -1) }, 0);
      }

      // "SKILLS" rises in letter by letter as it scrolls into view, like the hero name.
      const skillsTitle = SplitText.create('.skills__heading', { type: 'chars', mask: 'chars' });
      gsap.from(skillsTitle.chars, {
        yPercent: 110,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.045,
        scrollTrigger: { trigger: '.skills__heading', start: 'top 80%' },
      });

      // Skills: the shelf rises into view once.
      gsap.from('.shelf__stage', {
        y: 120,
        autoAlpha: 0,
        duration: 1.2,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.skills', start: 'top 70%' },
      });

      if (REAL_PROJECTS.length) {
        gsap.from('.work__row', {
          y: 50,
          autoAlpha: 0,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: { trigger: '.work__list', start: 'top 80%' },
        });
      }

      // Gentle depth between the set pieces: content drifts against the scroll, so even the calm parts move.
      // Transform-only and scrubbed to the (already Lenis-smoothed) scroll.
      const drift = (target, trigger, from, to) =>
        gsap.fromTo(
          target,
          { y: from },
          { y: to, ease: 'none', scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true } },
        );
      drift('.about__statement .scroll-reveal-text', '.about__statement', 70, -70); // text slides past the card
      drift('.skills__heading', '.skills__heading', 90, -40);

      // Footer: its lines rise and brighten as you arrive at the end of the page.
      gsap.fromTo(
        '.footer__row, .footer__credits',
        { y: 40, opacity: 0.15 },
        {
          y: 0,
          opacity: 1,
          ease: 'none',
          stagger: 0.15,
          scrollTrigger: { trigger: '.home__credits', start: 'top bottom', end: 'bottom bottom', scrub: true },
        },
      );

      // Journey: the stage pins and, as you scroll, the line draws itself across the top of the screen. When it
      // reaches a marker, the marker fills and that milestone's chapter takes over from the last one.
      const journeyStage = document.querySelector('.journey__stage');
      if (journeyStage) {
        const marks = gsap.utils.toArray('.journey__mark');
        const chapters = gsap.utils.toArray('.journey__chapter');
        const story = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: journeyStage,
            start: 'top top',
            end: () => `+=${window.innerHeight * (marks.length * 0.7 + 0.4)}`,
            pin: true,
            scrub: 0.6, // the line trails the scroll a touch, so drawing and retracting both glide
            invalidateOnRefresh: true,
          },
        });
        const line = journeyStage.querySelector('.journey__draw');
        const tip = journeyStage.querySelector('.journey__tip');
        story.fromTo(
          line,
          { drawSVG: '0%' },
          {
            drawSVG: '100%',
            duration: 1,
            onUpdate() {
              const p = line.getPointAtLength(this.progress() * line.getTotalLength());
              tip.setAttribute('cx', p.x);
              tip.setAttribute('cy', p.y);
              tip.style.visibility = this.progress() > 0 && this.progress() < 1 ? 'visible' : 'hidden';
            },
          },
          0,
        );
        const ats = marks.map((mark) => Number(mark.dataset.at) || 0);
        gsap.set(chapters, { autoAlpha: 0 });
        marks.forEach((mark, i) => {
          const at = ats[i];
          const chapter = chapters[i];
          story
            .from(mark.querySelector('.journey__dot'), { scale: 0, duration: 0.025, ease: 'back.out(3)' }, at - 0.01)
            .from(mark.querySelector('.journey__fill'), { scale: 0, duration: 0.03, ease: 'back.out(3)' }, at)
            .from(mark.querySelector('.journey__label'), { autoAlpha: 0, y: 6, duration: 0.04 }, at)
            .set(chapter, { autoAlpha: 1 }, at)
            .from(chapter.querySelector('.journey__year'), { yPercent: 102, duration: 0.07, ease: 'expo.out' }, at)
            .from(
              chapter.querySelectorAll('.journey__count, .journey__title, .journey__text'),
              { autoAlpha: 0, y: 28, duration: 0.06, stagger: 0.012, ease: 'power3.out' },
              at + 0.015,
            );
          // Hand over to the next chapter just before the line reaches its marker.
          if (i < marks.length - 1) {
            const out = Math.max(at + 0.08, ats[i + 1] - 0.045);
            story
              .to(chapter.querySelector('.journey__year'), { yPercent: -102, duration: 0.045, ease: 'power2.in' }, out)
              .to(
                chapter.querySelector('.journey__body'),
                { autoAlpha: 0, y: -20, duration: 0.035, ease: 'power2.in' },
                out,
              )
              .set(chapter, { autoAlpha: 0 }, out + 0.045);
          }
        });
        story.to({}, { duration: 0.1 }); // a beat on the last chapter before the section moves on
      }

      // "Let's talk" rolls on the same drum. Set up after the pinned sections above it, so its scroll positions
      // count their extra length.
      rollOnDrum(document.querySelector('.contact__title'));

      // A preview follows the pointer over the work list. Mouse and trackpad only.
      const preview = document.querySelector('.work__preview');
      const list = document.querySelector('.work__list');
      if (FINE_POINTER && preview && list) {
        const moveX = gsap.quickTo(preview, 'x', {
          duration: 0.5,
          ease: 'power3',
        });
        const moveY = gsap.quickTo(preview, 'y', {
          duration: 0.5,
          ease: 'power3',
        });
        const follow = (e) => {
          moveX(e.clientX);
          moveY(e.clientY);
        };
        const show = (e) => {
          gsap.set(preview, { x: e.clientX, y: e.clientY });
          gsap.to(preview, {
            autoAlpha: 1,
            scale: 1,
            rotate: -4,
            duration: 0.45,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        };
        const hide = () =>
          gsap.to(preview, {
            autoAlpha: 0,
            scale: 0.6,
            rotate: 0,
            duration: 0.35,
            ease: 'power3.in',
            overwrite: 'auto',
          });
        gsap.set(preview, {
          autoAlpha: 0,
          scale: 0.6,
          xPercent: -50,
          yPercent: -50,
        });
        list.addEventListener('pointermove', follow);
        list.addEventListener('pointerenter', show);
        list.addEventListener('pointerleave', hide);
        cleanups.push(() => {
          list.removeEventListener('pointermove', follow);
          list.removeEventListener('pointerenter', show);
          list.removeEventListener('pointerleave', hide);
        });
      }
    }, rootRef);

    // With smooth scroll on, a plain anchor jump lands in the wrong place, so glide there instead.
    const onAnchorClick = (event) => {
      const link = event.target.closest('a[href^="#"]');
      const target = link && document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { duration: 1.4 });
      history.pushState(null, '', link.getAttribute('href'));
    };
    document.addEventListener('click', onAnchorClick);
    // Thunder can finish loading after layout; re-measure so scroll positions match the final page.
    document.fonts.ready.then(() => ScrollTrigger.refresh());

    return () => {
      document.removeEventListener('click', onAnchorClick);
      cleanups.forEach((fn) => fn());
      context.revert();
    };
  }, [inert]);

  return (
    <div className="home" inert={inert} ref={rootRef}>
      {!inert && !REDUCED_MOTION && <CursorFollower />}
      {/* Mounted after the preloader so the track doesn't start downloading behind it. */}
      {!inert && <MusicToggleButton className="music-toggle" />}
      <StaggeredMenu
        isFixed
        items={MENU_ITEMS}
        displaySocials={false}
        logoUrl={logo}
        openMenuButtonColor="#18181b"
        accentColor="#FF6027"
      />
      <div className="work__preview" aria-hidden="true">
        <svg viewBox={`0 0 ${GLYPH.width} ${GLYPH.height}`}>
          <path d={HOOK_PATH} />
          <rect x={DOT.x} y={DOT.y} width={DOT.size} height={DOT.size} />
        </svg>
      </div>
      {/* Fixed elements above stay outside: inside the scrolling content they would scroll away. */}
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main>
            <section className="home__hero" id="home">
              <h1 className="home__title">
                <span className="home__first-name">MOHOMMAD</span> <span className="home__last-name">MASIHUDDIN</span>
              </h1>
            </section>

            {/* Section 2: room for the photo's scene. Empty without motion; the photo itself lives in About. */}
            <div className="photo-scene" aria-hidden="true" />

            <section className="about" id="about" aria-label="About">
              {/* The photo: full window in the scene above, then shrunk into this spot as you scroll. */}
              <div className="about__photo-slot">
                {/* Where the photo ends up: it lands on this card's picture, then the card builds around it. */}
                <div className="about__card">
                  <ProfileCard
                    avatarUrl={CONTENT.portrait}
                    name="Mohommad Masihuddin"
                    title="Developer"
                    handle="Masihh143"
                    status="Bangalore, India"
                    statusColor="#FF6027"
                    contactText="Contact"
                    onContactClick={() => lenisRef.current?.scrollTo('#contact', { duration: 1.4 })}
                    intro={false}
                  />
                </div>
                <div className="about__photo" aria-hidden="true">
                  <img src={CONTENT.portrait} alt="" />
                  <canvas className="about__photo-canvas" />
                </div>
              </div>
              <ScrollReveal
                containerClassName="about__statement"
                baseOpacity={0.12}
                blurStrength={6}
                baseRotation={0}
                highlightColor="#FF6027"
              >
                {CONTENT.about}
              </ScrollReveal>
            </section>

            <section className="work" id="projects" aria-label="Selected work">
              {/* Each line turns on a drum as it scrolls through: tipped back below, facing you mid-screen, tipped away above. */}
              <h2 className="work__heading" aria-label="What I've done">
                {['WHAT', "I'VE", 'DONE'].map((line) => (
                  <span className="work__heading-line" aria-hidden="true" key={line}>
                    {line}
                  </span>
                ))}
              </h2>
              <div className="work-reel">
                <WorkWall />
                <ul className="work-reel__strip" aria-label="Project gallery">
                  {CONTENT.projects.map((project, index) => {
                    const Card = project.url ? 'a' : 'div';
                    return (
                      <li key={index}>
                        <Card
                          className="work-reel__card"
                          {...(project.url
                            ? {
                                href: project.url,
                                target: '_blank',
                                rel: 'noreferrer',
                              }
                            : {})}
                        >
                          {/* The edge lights up orange where the cursor is; inside it, the music card's tilt, but gentler. */}
                          <BorderGlow
                            className="work-reel__glow"
                            glowColor="16 100 58"
                            backgroundColor="#141414"
                            colors={['#FF6027', '#FF9A6B', '#F5F5F5']}
                            borderRadius={8}
                            glowRadius={40}
                            glowIntensity={1.4}
                            edgeSensitivity={25}
                          >
                            <TiltedCard
                              imageSrc={project.image}
                              altText={`${project.title} screenshot`}
                              containerWidth="100%"
                              containerHeight="100%"
                              imageWidth="100%"
                              imageHeight="100%"
                              radius={8}
                              rotateAmplitude={5}
                              scaleOnHover={1.03}
                              glare={0.25}
                              showTooltip={false}
                              intro={false}
                              gyroscope={false}
                            >
                              {project.image ? (
                                <span className="work-reel__caption">
                                  {pad(index + 1)} — {project.title}
                                </span>
                              ) : (
                                <span className="work-reel__card-fallback">
                                  <span className="work-reel__card-index">{pad(index + 1)}</span>
                                  {project.title}
                                </span>
                              )}
                            </TiltedCard>
                          </BorderGlow>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {REAL_PROJECTS.length > 0 && (
                <ol className="work__list">
                  {REAL_PROJECTS.map((project, index) => {
                    const Row = project.url ? 'a' : 'div';
                    return (
                      <li key={project.title}>
                        <Row
                          className="work__row"
                          {...(project.url
                            ? {
                                href: project.url,
                                target: '_blank',
                                rel: 'noreferrer',
                              }
                            : {})}
                        >
                          <span className="work__index">{pad(index + 1)}</span>
                          <span className="work__title">{project.title}</span>
                          <span className="work__summary">{project.summary}</span>
                          <span className="work__tags">{project.tags.join(' / ')}</span>
                          <span className="work__year">{project.year}</span>
                        </Row>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* A passing beat before Skills: three huge lines that drift apart as you scroll past. */}
            <section className="bring" aria-label="What I bring">
              <h2 className="bring__title">
                {['WHAT', 'I', 'BRING'].map((word) => (
                  <span className="bring__line" key={word}>
                    {word}
                  </span>
                ))}
              </h2>
            </section>

            <section className="skills" id="skills" aria-labelledby="skills-title">
              <h2 className="skills__heading" id="skills-title">
                SKILLS
              </h2>
              <BookShelf books={CONTENT.skills} />
            </section>

            <section className="journey" id="journey" aria-labelledby="journey-title">
              <h2 className="journey__heading" id="journey-title">
                JOURNEY
              </h2>
              <Journey items={CONTENT.journey} />
            </section>

            <section className="contact" id="contact" aria-labelledby="contact-title">
              <h2 className="contact__title" id="contact-title" aria-label="Let's talk">
                {["LET'S", 'TALK'].map((line) => (
                  <span className="work__heading-line" aria-hidden="true" key={line}>
                    {line}
                  </span>
                ))}
              </h2>
            </section>

            {/* After "Let's talk" has rolled away: two hands reach in and offer a way to send a message. */}
            <ReachOut
              email={CONTENT.email}
              onDialogChange={(open) => (open ? lenisRef.current?.stop() : lenisRef.current?.start())}
            />
          </main>
          {/* Both licences require a visible credit. */}
          <footer className="home__credits">
            <div className="footer__row">
              <span>© {new Date().getFullYear()} Mohommad Masihuddin</span>
              <a href="#home">
                <FlipText>Back to top ↑</FlipText>
              </a>
            </div>
            <p className="footer__credits">
              Music:{' '}
              <a
                href="https://commons.wikimedia.org/wiki/File:Binbataye_Hindi_pop.oga"
                target="_blank"
                rel="noreferrer"
              >
                Binbataye
              </a>{' '}
              by Gadadharadas,{' '}
              <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">
                CC BY-SA 3.0
              </a>
              , converted to MP3. Music button by{' '}
              <a href="https://skiper-ui.com/v1/skiper25" target="_blank" rel="noreferrer">
                Skiper UI
              </a>
              . Dissolve after{' '}
              <a href="https://www.vengenceui.com/components/scroll-dissolve-reveal" target="_blank" rel="noreferrer">
                Vengeance UI
              </a>
              , ASCII hands from its{' '}
              <a href="https://www.vengenceui.com/components/animated-footer" target="_blank" rel="noreferrer">
                Animated Footer
              </a>
              . Text reveal, menu, profile card and card effects from{' '}
              <a href="https://reactbits.dev" target="_blank" rel="noreferrer">
                React Bits
              </a>
              .
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
