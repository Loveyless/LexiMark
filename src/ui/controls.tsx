import type { CSSProperties, ReactNode } from 'react'

export type IconName =
  | 'level'
  | 'target'
  | 'highlight'
  | 'globe'
  | 'volume'
  | 'book'
  | 'list'
  | 'filter'
  | 'info'
  | 'shield'

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function Icon(props: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={props.className ?? 'h-[18px] w-[18px]'}
    >
      {paths[props.name]}
    </svg>
  )
}

const paths: Record<IconName, ReactNode> = {
  level: (
    <>
      <path d="M5 19v-5" />
      <path d="M12 19V9" />
      <path d="M19 19V4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  highlight: (
    <>
      <path d="M4 20h16" />
      <path d="M7.5 16.5 16 8a2.1 2.1 0 0 1 3 3l-8.5 8.5H7.5v-3Z" />
      <path d="M14.5 6.5 17.5 9.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 3.2 2.8 14.8 0 18" />
      <path d="M12 3c-2.8 3.2-2.8 14.8 0 18" />
    </>
  ),
  volume: (
    <>
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
      <path d="M16 9.5a4 4 0 0 1 0 5" />
      <path d="M19 7a8 8 0 0 1 0 10" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 4.8 7 4.2 4 5v13c3-.8 6-.2 8 1.5" />
      <path d="M12 6.5c2-1.7 5-2.3 8-1.5v13c-3-.8-6-.2-8 1.5" />
      <path d="M12 6.5V19.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  filter: (
    <>
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 3 7.8 7 10 4-2.2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
}

export function Switch(props: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900',
        props.checked
          ? 'bg-brand-700 dark:bg-brand-600'
          : 'bg-stone-300 dark:bg-stone-700',
        props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <span
        className={cx(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          props.checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export function ToggleRow(props: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-stone-800 dark:text-stone-200">{props.label}</div>
        {props.description && (
          <p className="mt-0.5 text-xs leading-5 text-stone-500 dark:text-stone-400">
            {props.description}
          </p>
        )}
      </div>
      <Switch
        checked={props.checked}
        onChange={props.onChange}
        label={props.label}
        disabled={props.disabled}
      />
    </div>
  )
}

export function Segmented<T extends string>(props: {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
  label: string
  size?: 'md' | 'sm'
}) {
  const index = Math.max(
    0,
    props.options.findIndex((option) => option.value === props.value),
  )
  const count = props.options.length
  const small = props.size === 'sm'
  const padding = small ? 2 : 4
  const width = `calc((100% - ${padding * 2}px) / ${count})`

  const move = (next: number) => {
    const target = props.options[(next + count) % count]
    if (target) props.onChange(target.value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      className={cx(
        'relative flex w-full rounded-md bg-stone-100 dark:bg-stone-800/80',
        small ? 'p-0.5' : 'p-1',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute rounded bg-brand-50 shadow-sm ring-1 ring-brand-200/80 transition-transform duration-200 ease-out dark:bg-brand-900/70 dark:ring-brand-700/80',
          small ? 'inset-y-0.5 left-0.5' : 'inset-y-1 left-1',
        )}
        style={{ width, transform: `translateX(${index * 100}%)` }}
      />
      {props.options.map((option, i) => {
        const active = option.value === props.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => props.onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                move(i + 1)
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                move(i - 1)
              } else if (event.key === 'Home') {
                event.preventDefault()
                move(0)
              } else if (event.key === 'End') {
                event.preventDefault()
                move(count - 1)
              }
            }}
            className={cx(
              'relative z-10 flex-1 rounded font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
              small ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-sm',
              active
                ? 'text-brand-800 dark:text-white'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Range(props: {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  label: string
}) {
  const percent = ((props.value - props.min) / (props.max - props.min)) * 100
  return (
    <input
      type="range"
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value}
      aria-label={props.label}
      onChange={(event) => props.onChange(Number(event.target.value))}
      className="lm-range w-full"
      style={{ '--lm-fill': `${percent}%` } as CSSProperties}
    />
  )
}

export function Section(props: {
  icon: IconName
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cx(
        'rounded-lg border border-stone-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.03)]',
        'dark:border-stone-800 dark:bg-stone-900/60',
        props.className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          name={props.icon}
          className="mt-0.5 h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {props.title}
          </h2>
          {props.description && (
            <p className="mt-0.5 text-xs leading-5 text-stone-500 dark:text-stone-400">
              {props.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-4">{props.children}</div>
    </section>
  )
}
