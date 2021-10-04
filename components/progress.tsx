export interface ProgressProps {
  items: number;
  total: number;
}

export function Progress({items, total}: ProgressProps) {
  return (
    <span title={`${items} of ${total}`}>
      {(items / total * 100).toFixed(2)}&nbsp;%
    </span>
  );
}
