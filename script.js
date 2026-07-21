const body = document.body
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = window.matchMedia('(pointer: fine)').matches

/*===============
  interactive line field
  short ink strokes that turn to face the cursor, like
  iron filings around a magnet — calm and faint on cream.
===============*/

const canvas = document.querySelector('.field')
const ctx = canvas ? canvas.getContext('2d') : null

let segments = []
let dpr = 1
const SPACING = 46 // px between strokes
const LEN = 11 // half-length of each stroke
const RADIUS = 220 // cursor influence radius

const pointer = { x: -9999, y: -9999, active: false }

const buildField = () => {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  segments = []
  for (let x = SPACING / 2; x < w; x += SPACING) {
    for (let y = SPACING / 2; y < h; y += SPACING) {
      segments.push({ x, y, angle: -0.5, target: -0.5 })
    }
  }
}

const drawField = () => {
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineWidth = 1

  for (const s of segments) {
    let target = -0.5 // gentle ambient diagonal
    if (pointer.active) {
      const dx = pointer.x - s.x
      const dy = pointer.y - s.y
      const dist = Math.hypot(dx, dy)
      if (dist < RADIUS) {
        // strokes point toward the cursor, strength fading with distance
        const radial = Math.atan2(dy, dx)
        const pull = 1 - dist / RADIUS
        target = radial
        s.strength = pull
      } else {
        s.strength = 0
      }
    } else {
      s.strength = 0
    }

    // smoothly ease the current angle toward the target (shortest path)
    let diff = target - s.angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    s.angle += diff * 0.12

    const alpha = 0.10 + (s.strength || 0) * 0.32
    ctx.strokeStyle = `rgba(27, 26, 23, ${alpha})`
    const cos = Math.cos(s.angle) * LEN
    const sin = Math.sin(s.angle) * LEN
    ctx.beginPath()
    ctx.moveTo(s.x - cos, s.y - sin)
    ctx.lineTo(s.x + cos, s.y + sin)
    ctx.stroke()
  }
}

let rafId = null
const loop = () => {
  drawField()
  rafId = requestAnimationFrame(loop)
}

if (canvas && ctx) {
  buildField()
  if (reduceMotion) {
    drawField() // single static frame
  } else {
    loop()
  }

  window.addEventListener('resize', () => {
    buildField()
    if (reduceMotion) drawField()
  })

  if (finePointer && !reduceMotion) {
    window.addEventListener('mousemove', (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
    })
    window.addEventListener('mouseleave', () => {
      pointer.active = false
    })
  }
}

/*===============
  custom cursor (dot + trailing ring) + magnetic pull
===============*/

if (finePointer && !reduceMotion) {
  const dot = document.querySelector('.cursor-dot')
  const ring = document.querySelector('.cursor-ring')
  if (dot && ring) {
    body.classList.add('has-cursor')

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let rx = mx
    let ry = my

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX
      my = e.clientY
      dot.style.transform = `translate(${mx}px, ${my}px)`
    })

    const ringLoop = () => {
      rx += (mx - rx) * 0.18
      ry += (my - ry) * 0.18
      ring.style.transform = `translate(${rx}px, ${ry}px)`
      requestAnimationFrame(ringLoop)
    }
    ringLoop()

    // grow the ring over anything interactive
    const hoverTargets = document.querySelectorAll('a, button, .magnetic')
    hoverTargets.forEach((el) => {
      el.addEventListener('mouseenter', () => body.classList.add('cursor-hover'))
      el.addEventListener('mouseleave', () => body.classList.remove('cursor-hover'))
    })

    // magnetic pull toward the cursor
    const magnets = document.querySelectorAll('.magnetic')
    const STRENGTH = 0.35
    magnets.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect()
        const x = e.clientX - (r.left + r.width / 2)
        const y = e.clientY - (r.top + r.height / 2)
        el.style.transform = `translate(${x * STRENGTH}px, ${y * STRENGTH}px)`
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = ''
      })
    })
  }
}

/*===============
  mobile nav
===============*/

const btnHamburger = document.querySelector('.nav__hamburger .fas')
const navUl = document.querySelector('.nav__list')
const navToggle = document.querySelector('.nav__hamburger')

if (btnHamburger && navUl && navToggle) {
  const displayList = () => {
    if (btnHamburger.classList.contains('fa-bars')) {
      btnHamburger.classList.replace('fa-bars', 'fa-times')
      navUl.classList.add('display-nav-list')
    } else {
      btnHamburger.classList.replace('fa-times', 'fa-bars')
      navUl.classList.remove('display-nav-list')
    }
  }

  navToggle.addEventListener('click', displayList)

  navUl.querySelectorAll('.link--nav').forEach((link) =>
    link.addEventListener('click', () => {
      if (navUl.classList.contains('display-nav-list')) displayList()
    })
  )
}

/*===============
  scroll to top
===============*/

const btnScrollTop = document.querySelector('.scroll-top')

if (btnScrollTop) {
  document.addEventListener('scroll', () => {
    const scrolled =
      body.scrollTop > 500 || document.documentElement.scrollTop > 500
    btnScrollTop.style.display = scrolled ? 'flex' : 'none'
  })

  btnScrollTop.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: 'smooth' })
  )
}

/*===============
  scroll reveal
===============*/

const revealEls = document.querySelectorAll('[data-reveal]')

if ('IntersectionObserver' in window && !reduceMotion) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          obs.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )
  revealEls.forEach((el) => observer.observe(el))
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'))
}
