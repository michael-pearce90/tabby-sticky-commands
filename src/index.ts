import { NgModule } from '@angular/core'
import TabbyCoreModule from 'tabby-core'
import { TerminalDecorator } from 'tabby-terminal'
import { StickyCommandHeaderDecorator } from './stickyCommandHeaderDecorator'

@NgModule({
  imports: [
    TabbyCoreModule,
  ],
  providers: [
    {
      provide: TerminalDecorator,
      useClass: StickyCommandHeaderDecorator,
      multi: true,
    },
  ],
})
export default class StickyCommandHeaderModule { }
