import styles from '../css/Horarios.module.css'

import { useLoaderData } from 'react-router-dom';
import { HorarioJson } from '../types/types';

import List from '../components/List';


export default function Horarios(){
    const horarios = useLoaderData() as HorarioJson[];

    return (
        <div className={styles.fullPage}>
            <div className={styles.container}>
                <h2>HORARIOS</h2>
                <List<HorarioJson>
                renderItem={(horario: HorarioJson) => (
                    <div>
                    <strong>{horario.diaHora}</strong> - {horario.usuarios}
                    </div>
                )}
                data={horarios}
                />
            </div>
        </div>
    )
}