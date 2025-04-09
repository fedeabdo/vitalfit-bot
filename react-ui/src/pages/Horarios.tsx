import styles from '../css/Horarios.module.css'

import { useLoaderData } from 'react-router-dom';
import { HorarioJson } from '../types/types';
import Font from 'react-font'

import List from '../components/List';


export default function Horarios(){
    const horarios = useLoaderData() as HorarioJson[];

    return (
        <div className={styles.fullPage}>
            <div className={styles.container}>
                <Font family='Bungee Inline'>
                    <h2>Horarios</h2>
                </Font>
                <List<HorarioJson>
                renderItem={(horario: HorarioJson) => (
                    <div>
                    <strong>{horario.diaHora}</strong> - {horario.usuarios.join(', ')}
                    </div>
                )}
                data={horarios}
                />
            </div>
        </div>
    )
}