import * as go from "gojs";
import { saveAs } from 'file-saver'; // Para descargar el archivo
import { useNavigate } from 'react-router-dom';

import { useEffect, useRef, useState } from "react";
import DiagramWrapper from "../DiagramWrapper";
import { ReactDiagram } from "gojs-react";
import { io } from 'socket.io-client';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';

const initialData = {
  nodeDataArray: [
    {
      key: "Fred",
      text: "Fred: Patron",
      isGroup: true,
      loc: "0 0",
      duration: 9,
    },
    {
      key: "Bob",
      text: "Bob: Waiter",
      isGroup: true,
      loc: "100 0",
      duration: 9,
    },
    {
      key: "Hank",
      text: "Hank: Cook",
      isGroup: true,
      loc: "200 0",
      duration: 9,
    },
    {
      key: "Renee",
      text: "Renee: Cashier",
      isGroup: true,
      loc: "300 0",
      duration: 9,
    },
    { group: "Bob", start: 1, duration: 2 },
    { group: "Hank", start: 2, duration: 3 },
    { group: "Fred", start: 3, duration: 1 },
    { group: "Bob", start: 5, duration: 1 },
    { group: "Fred", start: 6, duration: 2 },
    { group: "Renee", start: 8, duration: 1 },
  ],

  linkDataArray: [
    { from: "Fred", to: "Bob", text: "order", time: 1 },
    { from: "Bob", to: "Hank", text: "order food", time: 2 },
    { from: "Bob", to: "Fred", text: "serve drinks", time: 3 },
    { from: "Hank", to: "Bob", text: "finish cooking", time: 5 },
    { from: "Bob", to: "Fred", text: "serve food", time: 6 },
    { from: "Fred", to: "Renee", text: "pay", time: 8 },
  ],
};

const Reunion: React.FC = () => {
  const location = useLocation();

  const { id, codigo } = useParams();
  const [data, setData] = useState(initialData);
  const [nextNodeX, setNextNodeX] = useState(400);
  const navigate = useNavigate()

  const diagramRef = useRef<ReactDiagram | null>(null);
  const socket = io('https://backsw.up.railway.app/reunion');
  let timeoutId;

  useEffect(() => {
    axios.get(`https://backsw.up.railway.app/diagrama/obtenerDiagramaIdReunion/${id}`)
      .then(async (response) => {


        const tipo = (location.state && location.state.tipo) || 'default'; 

        console.log("tipo: ", tipo)
        if (tipo === 'unirse' || tipo === 'nueva' || (location.state && location.state.usuarioId === response.data.usuarioId)) {
          // await axios.post(`https://backsw.up.railway.app/colaborador/agregar`, { //Registramos al usuario como colaborador
          //   usuarioId: usuarioId, // Asegúrate de tener el ID del usuario en el estado de tu componente
          //   reunionId: id, // ID de la reunión a la que se está uniendo el usuario
          // });
          console.log('response.data : ', response.data)
          setData(response.data);
        } else {
          navigate('/')
        }
      })
      .catch((error) => {
        // Maneja errores, por ejemplo, mostrando un mensaje al usuario
        console.error('Error al obtener el diagrama:', error);
      });

    socket.on('actualizarDiagramas', (updateData) => {
      console.log('data recib: ', updateData);
      setData(updateData,);
    });
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);
  // Función para gregar nodo
  const addNode = (_position) => {
    // Genera un nuevo nodo con una clave única
    //Holaa
    const newNode = {
      key: "newNode" + Date.now(),
      text: "NewNode",
      isGroup: true,
      loc: `${nextNodeX} 0`, 
      duration: 3, 
    };

    // Copia el array existente y agrega el nuevo nodo
    const newNodeDataArray = [...data.nodeDataArray, newNode];

    // Actualiza el estado con el nuevo array de nodos
    setData({
      ...data,
      nodeDataArray: newNodeDataArray,
    });
    socket.emit('actualizarDiagrama', { id, data: { nodeDataArray: newNodeDataArray, linkDataArray: data.linkDataArray } });
    convertSVG();
    setNextNodeX(nextNodeX + 100);
  };

  const handleDiagramEvent = () => { };

  // Cuando se realice un cambio
  const handleModelChange = (obj: go.IncrementalData) => {
    if (diagramRef.current) {
      const model = diagramRef.current.getDiagram()?.model;
      // console.log("obj.modifiedLinkData[0] : ", obj.modifiedLinkData[0]);
      // data.linkDataArray.push(obj.modifiedLinkData[0].toJson);
      if (model) {
        const diagramData = {
          ...data,
          nodeDataArray: model.nodeDataArray,
          // @ts-ignore

          linkDataArray: model.linkDataArray

        };

        // Convierte el objeto del diagrama en JSON y guárdalo en el estado o variable
        // @ts-ignore

        setData(diagramData);
        // Cancela el envío anterior y programa un nuevo envío después de 500ms
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // @ts-ignore

          socket.emit('actualizarDiagrama', { id, data: { nodeDataArray: model.nodeDataArray, linkDataArray: model.linkDataArray } });
        }, 500);

        const reunionId = id;

        socket.emit('guardarDiagrama', { reunionId, diagrama: JSON.stringify(diagramData) });
        convertSVG();
      }
    }

    console.log("Model changed:", obj);
  };
  

  const downloadSvg = () => {
    if (diagramRef.current) {
      const diagram = diagramRef.current.getDiagram();

      if (diagram) {
        
        const svgString = diagram.makeSvg({
          scale: 1,
          background: 'white',
        });
        const svgText = new XMLSerializer().serializeToString(svgString);

        
        const blob = new Blob([svgText], { type: 'image/svg+xml' });

        
        saveAs(blob, 'diagrama.svg');

        axios.post('https://backsw.up.railway.app/reuniones/savesvg', { svgString: svgText, id })
          .then(_response => {
            // console.log('SVG guardado correctamente en el servidor:', response.data);
          })
          .catch(error => {
            console.error('Error al guardar el SVG:', error);
          });
      }
    }
  };
  const convertSVG = () => {
    const diagram = diagramRef.current.getDiagram();

    if (diagram) {
      // Obtén el elemento SVG del diagrama
      const svgString = diagram.makeSvg({
        scale: 1,  // Puedes ajustar la escala según sea necesario
        background: 'white',  // Puedes cambiar el fondo si lo deseas
      });
      const svgText = new XMLSerializer().serializeToString(svgString);

      axios.post('https://backsw.up.railway.app/reuniones/savesvg', { svgString: svgText, id })
        .then(_response => {
          // console.log('SVG guardado correctamente en el servidor:', response.data);
        })
    }
  };
  // Función para encontrar el ID del nodo correspondiente en StarUML a partir de la clave del nodo de GoJS
  const handleConvertJavaButtonClick = () => {
    if (diagramRef.current) {
      const diagram = diagramRef.current.getDiagram();
      if (diagram) {
        // Enviar los datos al backend para la conversión a Java
        const requestData = {
          nodeDataArray: diagram.model.nodeDataArray,
          // @ts-ignore

          linkDataArray: diagram.model.linkDataArray
        };

        axios.post('https://backsw.up.railway.app/reuniones/java', requestData)
          .then(response => {
            // Obtener el contenido de texto del servidor
            const javaCode = response.data;

            // Crear un Blob con el contenido de texto
            const blob = new Blob([javaCode], { type: 'text/plain' });

            // Crear una URL para el Blob
            const url = window.URL.createObjectURL(blob);

            // Crear un enlace <a> para descargar el archivo
            const a = document.createElement('a');
            a.href = url;
            a.download = 'DiagramaJava.java'; // Nombre del archivo a descargar

            // Agregar el enlace al DOM y hacer clic en él para iniciar la descarga
            document.body.appendChild(a);
            a.click();

            // Eliminar el enlace del DOM después de la descarga
            window.URL.revokeObjectURL(url);
          })
          .catch(error => {
            console.error('Error al enviar datos al backend:', error);
          });
      }
    }
  };
  const handleConvertPythonButtonClick = () => {
    if (diagramRef.current) {
      const diagram = diagramRef.current.getDiagram();
      if (diagram) {
        // Enviar los datos al backend para la conversión a Java
        const requestData = {
          nodeDataArray: diagram.model.nodeDataArray,      // @ts-ignore

          linkDataArray: diagram.model.linkDataArray
        };

        axios.post('https://backsw.up.railway.app/reuniones/python', requestData)
          .then(response => {
            // Obtener el contenido de texto del servidor
            const pythonCode = response.data;

            // Crear un Blob con el contenido de texto
            const blob = new Blob([pythonCode], { type: 'text/plain' });

            // Crear una URL para el Blob
            const url = window.URL.createObjectURL(blob);

            // Crear un enlace <a> para descargar el archivo
            const a = document.createElement('a');
            a.href = url;
            a.download = 'DiagramaPython.py'; // Nombre del archivo a descargar

            // Agregar el enlace al DOM y hacer clic en él para iniciar la descarga
            document.body.appendChild(a);
            a.click();

            // Eliminar el enlace del DOM después de la descarga
            window.URL.revokeObjectURL(url);
          })
          .catch(error => {
            console.error('Error al enviar datos al backend:', error);
          });
      }
    }
  };
  const handleConvertJavaScriptButtonClick = () => {
    if (diagramRef.current) {
      const diagram = diagramRef.current.getDiagram();
      if (diagram) {
        // Enviar los datos al backend para la conversión a Java
        const requestData = {
          nodeDataArray: diagram.model.nodeDataArray,
          // @ts-ignore

          linkDataArray: diagram.model.linkDataArray
        };

        axios.post('https://backsw.up.railway.app/reuniones/javascript', requestData)
          .then(response => {
            // Obtener el contenido de texto del servidor
            const jsCode = response.data;

            // Crear un Blob con el contenido de texto
            const blob = new Blob([jsCode], { type: 'text/plain' });

            // Crear una URL para el Blob
            const url = window.URL.createObjectURL(blob);

            // Crear un enlace <a> para descargar el archivo
            const a = document.createElement('a');
            a.href = url;
            a.download = 'DiagramaJavaScript.js'; // Nombre del archivo a descargar

            // Agregar el enlace al DOM y hacer clic en él para iniciar la descarga
            document.body.appendChild(a);
            a.click();

            // Eliminar el enlace del DOM después de la descarga
            window.URL.revokeObjectURL(url);
          })
          .catch(error => {
            console.error('Error al enviar datos al backend:', error);
          });
      }
    }
  };

  const handleGojsDownloadButtonClick = () => {
    if (diagramRef.current) {
      const diagram = diagramRef.current.getDiagram();
      if (diagram) {
        const jsonData = diagram.model.toJson();
        const blob = new Blob([jsonData], { type: 'application/gojs' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagramGoJS.gojs'; // Nombre del archivo a descargar
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    }
  };
  const handleUploadFile = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target.result;
        if (data) {
          const jsonData = typeof data === "string" ? JSON.parse(data) : null;
          if (jsonData) {
            if (diagramRef.current) {
              const diagram = diagramRef.current.getDiagram();
              if (diagram) {
                diagram.model = go.Model.fromJson(jsonData);
              }
            }
          } else {
            console.error("Error al analizar el archivo JSON.");
          }
        }
      };
      reader.readAsText(file);
    } else {
      console.error("No se seleccionó ningún archivo.");
    }
  };


  
  <input type="file" accept=".gojs" onChange={handleUploadFile} key={Math.random()} />

  return (
    <div style={{ 
      maxHeight: "80vh", 
      overflowY: "scroll", 
      overflowX: "hidden",
      backgroundColor: "#f5f5f5", // Color de fondo gris claro
      padding: "20px", // Espaciado interior de 20px
      borderRadius: "8px", // Bordes redondeados de 8px
      boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)", // Sombra ligera
      fontSize: "15px",
      }}>

      <div>
          Datos de la Reunión:
        <ul>
          <li>Código de la Reunión: {codigo} </li>
          {/* {password && <li>Contraseña de la Reunión: {password}</li>} */}
        </ul>
      </div>

      <br></br>
        <DiagramWrapper
          diagramRef={diagramRef}
          nodeDataArray={data.nodeDataArray}
          linkDataArray={data.linkDataArray}
          onDiagramEvent={handleDiagramEvent}
          onModelChange={handleModelChange}
        // onNodeDoubleClicked={handleNodeDoubleClicked}
        />
      <br></br>
      <div>
          Abrir archivo:
      </div>
      <br></br>
      <div>
        <input type="file" accept=".gojs" onChange={handleUploadFile} key={Math.random()} />
      </div>

      <br></br>
      <div>
          Opciones:
      </div>
      <div style={{ 
        maxHeight: "80vh", 
        overflowX: "hidden",
        backgroundColor: "#f5f5f5", // Color de fondo gris claro
        padding: "20px", // Espaciado interior de 20px
        borderRadius: "8px", // Bordes redondeados de 8px
        fontSize: "15px",
        }}>
      
        <button style={{backgroundColor: "#df6705", color: "white"}} onClick={addNode}>Añadir Nodo</button>
        <button style={{backgroundColor: "#df6705", color: "white"}} onClick={downloadSvg}>Descargar Imagen SVG</button>
        <button style={{backgroundColor: "#df6705", color: "white"}} onClick={handleConvertJavaButtonClick}>Convertir a Java</button>
        <button style={{backgroundColor: "#df6705", color: "white"}} onClick={handleConvertPythonButtonClick}>Convertir a Python</button>
        <button style={{backgroundColor: "#df6705", color: "white"}} onClick={handleConvertJavaScriptButtonClick}>Convertir a JavaScript</button>
        <button style={{backgroundColor: "#df6705", color: "white"}} onClick={handleGojsDownloadButtonClick}>Descargar Diagrama GoJs</button>

      </div>

    </div>
  );
};
export default Reunion;