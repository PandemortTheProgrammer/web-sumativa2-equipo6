interface IconProps {
  id: string;
  size?: 'sm' | 'lg';
  className?: string;
}

/** Ícono del sprite: <Icon id="bed" /> dibuja #i-bed */
export function Icon({ id, size, className }: IconProps) {
  const cls = ['icon', size && `icon--${size}`, className].filter(Boolean).join(' ');
  return (
    <svg className={cls} aria-hidden="true">
      <use href={`#i-${id}`} />
    </svg>
  );
}
