import React, { useEffect, useRef } from "react"
import { Color, Mesh, Program, Renderer, Triangle } from "ogl"

import "./threads.css"
import { cn } from "@/lib/utils"

import { fragmentShader, vertexShader } from "./shaders"

type ThreadsProps = {
    color?: [number, number, number]
    amplitude?: number
    distance?: number
    enableMouseInteraction?: boolean
} & Omit<React.HTMLAttributes<HTMLDivElement>, "color">

const Threads = ({
                     color = [1, 1, 1],
                     amplitude = 1,
                     distance = 0,
                     enableMouseInteraction = false,
                     className,
                     ...rest
                 }: ThreadsProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const animationFrameId = useRef(0)

    // Keep the latest props in a ref, so updating them mutates the live shader
    // uniforms instead of tearing down and rebuilding the whole WebGL context.
    const propsRef = useRef({ color, amplitude, distance, enableMouseInteraction })
    propsRef.current = { color, amplitude, distance, enableMouseInteraction }

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // No WebGL context (headless browsers, remote desktops, exhausted
        // contexts) must degrade to a plain background, not crash the screen:
        // OGL dereferences the context unguarded during construction.
        let renderer: Renderer
        try {
            renderer = new Renderer({ alpha: true })
        } catch {
            return
        }
        const gl = renderer.gl
        if (!gl) return
        gl.clearColor(0, 0, 0, 0)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        container.appendChild(gl.canvas)

        const geometry = new Triangle(gl)
        const program = new Program(gl, {
            vertex: vertexShader,
            fragment: fragmentShader,
            uniforms: {
                iTime: { value: 0 },
                iResolution: {
                    value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
                },
                uColor: { value: new Color(...propsRef.current.color) },
                uAmplitude: { value: propsRef.current.amplitude },
                uDistance: { value: propsRef.current.distance },
                uMouse: { value: new Float32Array([0.5, 0.5]) },
            },
        })

        const mesh = new Mesh(gl, { geometry, program })

        // The fragment shader is heavy (per-pixel Perlin noise across many lines), so
        // its cost scales with the number of rendered pixels. Cap the internal render
        // resolution to keep large / high-DPI screens smooth; the effect is soft
        // enough that the downscale is imperceptible.
        const MAX_RENDER_DIM = 1920

        function resize() {
            if (!container) return
            const { clientWidth, clientHeight } = container
            const baseDpr = Math.min(window.devicePixelRatio || 1, 2)
            const longestSide = Math.max(clientWidth, clientHeight) * baseDpr
            renderer.dpr = longestSide > MAX_RENDER_DIM ? (baseDpr * MAX_RENDER_DIM) / longestSide : baseDpr
            renderer.setSize(clientWidth, clientHeight)
            program.uniforms.iResolution.value.r = gl.canvas.width
            program.uniforms.iResolution.value.g = gl.canvas.height
            program.uniforms.iResolution.value.b = gl.canvas.width / gl.canvas.height
        }

        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(container)
        window.addEventListener("resize", resize)
        resize()

        const currentMouse = [0.5, 0.5]
        let targetMouse = [0.5, 0.5]

        function handleMouseMove(e: MouseEvent) {
            if (!container) return
            const rect = container.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = 1.0 - (e.clientY - rect.top) / rect.height
            targetMouse = [x, y]
        }

        function handleMouseLeave() {
            targetMouse = [0.5, 0.5]
        }

        container.addEventListener("mousemove", handleMouseMove)
        container.addEventListener("mouseleave", handleMouseLeave)

        // Only animate while the canvas is on screen and the tab is visible, so the
        // shader never burns GPU/CPU for something the user can't see.
        let isVisible = true
        const intersectionObserver = new IntersectionObserver(
            entries => {
                isVisible = entries[0].isIntersecting
            },
            { threshold: 0 },
        )
        intersectionObserver.observe(container)

        function update(t: number) {
            animationFrameId.current = requestAnimationFrame(update)
            if (!isVisible || document.hidden) return

            const { color, amplitude, distance, enableMouseInteraction } = propsRef.current

            program.uniforms.uColor.value.set(...color)
            program.uniforms.uAmplitude.value = amplitude
            program.uniforms.uDistance.value = distance

            if (enableMouseInteraction) {
                const smoothing = 0.05
                currentMouse[0] += smoothing * (targetMouse[0] - currentMouse[0])
                currentMouse[1] += smoothing * (targetMouse[1] - currentMouse[1])
                program.uniforms.uMouse.value[0] = currentMouse[0]
                program.uniforms.uMouse.value[1] = currentMouse[1]
            } else {
                program.uniforms.uMouse.value[0] = 0.5
                program.uniforms.uMouse.value[1] = 0.5
            }
            program.uniforms.iTime.value = t * 0.001

            renderer.render({ scene: mesh })
        }

        animationFrameId.current = requestAnimationFrame(update)

        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current)
            resizeObserver.disconnect()
            intersectionObserver.disconnect()
            window.removeEventListener("resize", resize)
            container.removeEventListener("mousemove", handleMouseMove)
            container.removeEventListener("mouseleave", handleMouseLeave)
            if (container.contains(gl.canvas)) container.removeChild(gl.canvas)
            gl.getExtension("WEBGL_lose_context")?.loseContext()
        }
    }, [])

    return <div ref={containerRef} className={cn("threads-container", className)} {...rest} />
}

export default Threads
