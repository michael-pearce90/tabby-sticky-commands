import { Injectable } from '@angular/core'
import { TerminalDecorator } from 'tabby-terminal'

@Injectable()
export class StickyCommandHeaderDecorator extends TerminalDecorator {
  private cleanup = new WeakMap<any, () => void>()

  attach (terminal: any): void {
    const host = terminal.element?.nativeElement as HTMLElement | undefined

    if (!host) {
      return
    }

    host.style.position = host.style.position || 'relative'

    const header = document.createElement('div')
    header.className = 'tabby-sticky-command-header'
    header.style.display = 'none'
    header.style.position = 'absolute'
    header.style.top = '0'
    header.style.left = '0'
    header.style.right = '0'
    header.style.zIndex = '100'
    header.style.padding = '4px 8px'
    header.style.fontFamily = 'var(--font-family, monospace)'
    header.style.fontSize = '12px'
    header.style.lineHeight = '18px'
    header.style.whiteSpace = 'nowrap'
    header.style.overflow = 'hidden'
    header.style.textOverflow = 'ellipsis'
    header.style.background = 'rgba(0, 0, 0, 0.82)'
    header.style.color = '#fff'
    header.style.pointerEvents = 'none'

    host.appendChild(header)

    let pendingInput = ''
    let lastCommand = ''
    let alternateScreenActive = false
    let viewport: HTMLElement | null = null

    const isAtBottom = (): boolean => {
      if (!viewport) {
        return true
      }

      return viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 4
    }

    const updateHeader = (): void => {
      if (!lastCommand || alternateScreenActive || isAtBottom()) {
        header.style.display = 'none'
        return
      }

      header.textContent = `Command: ${lastCommand}`
      header.style.display = 'block'
    }

    const findViewport = (): void => {
      viewport = host.querySelector('.xterm-viewport') as HTMLElement | null

      if (viewport) {
        viewport.addEventListener('scroll', updateHeader)
      }

      updateHeader()
    }

    const inputSubscription = terminal.input$.subscribe((buffer: Buffer) => {
      const text = buffer.toString('utf8')

      for (const char of text) {
        if (char === '\r' || char === '\n') {
          const command = pendingInput.trim()

          if (command) {
            lastCommand = command
          }

          pendingInput = ''
          updateHeader()
          continue
        }

        if (char === '\u0008' || char === '\u007f') {
          pendingInput = pendingInput.slice(0, -1)
          continue
        }

        if (char >= ' ' && char !== '\u001b') {
          pendingInput += char
        }
      }
    })

    this.subscribeUntilDetached(terminal, inputSubscription)

    const alternateScreenSubscription = terminal.alternateScreenActive$.subscribe(active => {
      alternateScreenActive = active
      updateHeader()
    })

    this.subscribeUntilDetached(terminal, alternateScreenSubscription)

    const frontendReadySubscription = terminal.frontendReady$.subscribe(() => {
      window.setTimeout(findViewport, 250)

      if (terminal.frontend) {
        const contentSubscription = terminal.frontend.contentUpdated$.subscribe(updateHeader)
        this.subscribeUntilDetached(terminal, contentSubscription)
      }
    })

    this.subscribeUntilDetached(terminal, frontendReadySubscription)

    window.setTimeout(findViewport, 500)

    this.cleanup.set(terminal, () => {
      if (viewport) {
        viewport.removeEventListener('scroll', updateHeader)
      }

      header.remove()
    })
  }

  detach (terminal: any): void {
    this.cleanup.get(terminal)?.()
    this.cleanup.delete(terminal)
    super.detach(terminal)
  }
}
