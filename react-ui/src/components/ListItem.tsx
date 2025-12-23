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

  const normalizedHora = hora?.trim();

  const horario = data?.horarios.find((h) => {
    if (!h?.hora || !normalizedHora) return false;
    return h.hora.trim() === normalizedHora;
  });



  const className = isLoading
    ? styles.listItem
    : horario && horario.disponible
    ? `${styles.listItem} ${styles.notUsed}`
    : `${styles.listItem} ${styles.used}`;

  return (
    <li className={className} onClick={() => onClick?.(item)}>
      {renderItem(item)}
    </li>
  );
}
