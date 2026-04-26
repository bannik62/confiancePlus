<script>
  import { onMount } from 'svelte'

  let canvas

  onMount(() => {
    const el = canvas
    const ctx = el.getContext('2d')
    if (!ctx) return () => {}

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return () => {}

    let w = 0
    let h = 0
    let raf = 0
    let running = true
    const particles = []

    /** Mis à jour au resize : mobile = moins d’additif + trail plus « lave » la lumière */
    let isNarrow = false

    function resize() {
      w = el.width = window.innerWidth
      h = el.height = window.innerHeight
      isNarrow = w <= 480
    }

    class Particle {
      constructor() {
        this.reset()
      }

      reset() {
        this.x = Math.random() * w
        this.y = Math.random() * h
        if (isNarrow) {
          this.size = Math.random() * 240 + 90
          this.vx = (Math.random() - 0.5) * 0.46
          this.vy = (Math.random() - 0.5) * 0.28
        } else {
          this.size = Math.random() * 300 + 110
          this.vx = (Math.random() - 0.5) * 0.54
          this.vy = (Math.random() - 0.5) * 0.33
        }
        const colors = [
          { h: 258, s: 72, l: 48 },
          { h: 198, s: 82, l: 48 },
          { h: 275, s: 68, l: 54 },
          { h: 305, s: 65, l: 50 },
        ]
        this.color = colors[Math.floor(Math.random() * colors.length)]
        this.opacity = 0
        this.life = 0
        /* Pulse / cycle de vie — un peu plus vif qu’avant */
        this.speed = (Math.random() * 0.0046 + 0.00155) * (isNarrow ? 0.85 : 1)
      }

      update() {
        this.x += this.vx
        this.y += this.vy
        this.life += this.speed
        this.opacity = Math.sin(this.life)
        if (this.life >= Math.PI) this.reset()
      }

      draw() {
        if (this.opacity <= 0) return
        const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size)
        const c = this.color
        /*
         * Mobile : `screen` reste lisible mais pic plus bas + trail moins agressif qu’avant
         * pour limiter le blanc ; desktop un peu plus présent qu’avant la régression.
         */
        const peak = isNarrow ? 0.044 : 0.068
        const a = this.opacity * peak
        g.addColorStop(0, `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`)
        g.addColorStop(1, `hsla(${c.h}, ${c.s}%, ${c.l}%, 0)`)
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = g
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2)
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const n = isNarrow ? 24 : 28
    for (let i = 0; i < n; i++) particles.push(new Particle())

    const tick = () => {
      if (!running) return
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = isNarrow ? 'rgba(7, 7, 26, 0.09)' : 'rgba(7, 7, 26, 0.078)'
      ctx.fillRect(0, 0, w, h)

      particles.forEach((p) => {
        p.update()
        p.draw()
      })
      raf = requestAnimationFrame(tick)
    }

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        running = false
        cancelAnimationFrame(raf)
      } else {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  })
</script>

<canvas bind:this={canvas} class="aurora-canvas" aria-hidden="true"></canvas>

<style>
  .aurora-canvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0.72;
  }

  @media (max-width: 480px) {
    .aurora-canvas {
      opacity: 0.56;
      filter: brightness(0.9) saturate(0.94);
    }
  }
</style>
