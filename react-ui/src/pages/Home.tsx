import { useLoaderData } from 'react-router-dom';
import {useState} from "react"
import { HoraUsuarios } from '../types/types';
import styles from '../css/Home.module.css';
import {FaPlus, FaTrashAlt} from 'react-icons/fa'
import { IconContext } from "react-icons";
import { motion } from 'framer-motion';
import Font from 'react-font'

import List from '../components/List';

export default function Home() {
  // Use the useLoaderData hook to get the data loaded by reservasLoader
  const reservas = useLoaderData() as HoraUsuarios[];
  const [selectedUsuario, setSelectedUsuario] = useState<string | null>(null);

  const handleUsuarioClick = (usuario: string) => {
    setSelectedUsuario(usuario === selectedUsuario ? null : usuario);
  };

  const handleAddclick = async (nombre: string) => {
    try {
      const response = await fetch(`http://localhost:5100/api/usuario?nombre=${encodeURIComponent(nombre)}`);
  
      if (!response.ok) {
        throw new Error("Error fetching usuario data");
      }
  
      const data = await response.json();
      console.log("Usuario data:", data);
      // Do something with the data (e.g., show modal, route, etc.)
    } catch (error) {
      console.error("API error:", error);
    }
  };

  const handleDeleteClick = async (nombre: string) => {
    try {
      const response = await fetch(`http://localhost:5100/api/usuario?nombre=${encodeURIComponent(nombre)}`);
  
      if (!response.ok) {
        throw new Error("Error fetching usuario data");
      }
  
      const data = await response.json();
      console.log("Usuario data:", data);
      // Do something with the data (e.g., show modal, route, etc.)
    } catch (error) {
      console.error("API error:", error);
    }
  };
  
  


  return (
    <div className={styles.fullPage}>
      <div className={styles.container}>
        <Font family='Bungee Inline'>
          <h2>Reservas</h2>
        </Font>
        <List<HoraUsuarios>
          data={reservas}
          renderItem={(reserva: HoraUsuarios) => (
            <div>
              <strong>{reserva.hora}</strong>
              <ul className={styles.userList}>
                {reserva.usuarios.map((nombre, i) => (
                    <li key={i} className={styles.userItem}>
                      <span
                        onClick={nombre === "No hay reservas" ? undefined : () => handleUsuarioClick(nombre)}
                        className={`${styles.userName} ${nombre === "No hay reservas" ? styles.disabledUser : ""}`}
                      >
                        {nombre}
                      </span>
                        <motion.span
                          className={styles.iconButtons}
                          initial={false}
                          animate={
                            selectedUsuario === nombre
                              ? { opacity: 1, scale: 1 }
                              : { opacity: 0, scale: 0.5 }
                          }
                          transition={{ duration: 0.25, ease: [0.175, 0.885, 0.32, 1.275] }}
                          style={{ pointerEvents: selectedUsuario === nombre ? 'auto' : 'none' }}
                        >
                          <button
                            onClick={() => handleAddclick(nombre)}
                            className={styles.iconButton}
                            title="Add"
                          >
                            <IconContext.Provider value={{ color: "green" }}>
                              <div>
                                <FaPlus />
                              </div>
                            </IconContext.Provider>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(nombre)}
                            className={styles.iconButton}
                            title="Delete"
                          >
                            <IconContext.Provider value={{ color: "red" }}>
                              <div>
                                <FaTrashAlt />
                              </div>
                            </IconContext.Provider>
                          </button>
                        </motion.span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        />
      </div>
    </div>
  );
};