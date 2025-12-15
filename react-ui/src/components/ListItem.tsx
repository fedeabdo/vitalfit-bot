import styles from '../css/ListItem.module.css';
import { useAvailablePlaces } from '../hooks/useAvailablePlaces';

interface ListItemProps<T> {
  item: T;
  hora: string;
  onClick?: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
}

export default function ListItem<T>({
  item,
  hora,
  onClick,
  renderItem,
}: ListItemProps<T>) {
  const { data, isLoading } = useAvailablePlaces();

  // Find the matching hour from the API response
  const horario = data?.horarios.find(
    (h) => h.hora.trim() === hora.trim()
  );

  const className = isLoading
    ? styles.listItem
    : horario && horario.lugaresDisponibles > 0
    ? `${styles.listItem} ${styles.notUsed}`
    : `${styles.listItem} ${styles.used}`;

  return (
    <li className={className} onClick={() => onClick?.(item)}>
      {renderItem(item)}
    </li>
  );
}
