
Facebook
/
léxico
Público
Lexical es un marco de editor de texto extensible que proporciona una excelente fiabilidad, accesibilidad y rendimiento.

léxico.dev
Licencia
 licencia MIT
 12.6k estrellas 684 tenedores 
Código
Cuestiones
102
Solicitudes de extracción
dieciséis
Discusiones
Comportamiento
Proyectos
Seguridad
Perspectivas
facebook/léxico
Última confirmación
@trueadm
trueadm
…
6 hours ago
Estadísticas de Git
archivos
LÉAME.md
Léxico
Estado del flujo de trabajo de GitHub Visite la página del MNP Agrégate a nuestro Discord Síganos en Twitter

Lexical es un marco extensible de editor de texto web de JavaScript con énfasis en la confiabilidad, la accesibilidad y el rendimiento. Lexical tiene como objetivo proporcionar la mejor experiencia de desarrollador de su clase, para que pueda crear fácilmente prototipos y crear funciones con confianza. Combinado con una arquitectura altamente extensible, Lexical permite a los desarrolladores crear experiencias de edición de texto únicas que escalan en tamaño y funcionalidad.

Para obtener documentación y más información sobre Lexical, asegúrese de visitar el sitio web de Lexical .

Estos son algunos ejemplos de lo que puede hacer con Lexical:

Patio de juegos léxico
Caja de arena de texto sin formato
Zona de pruebas de texto enriquecido
Descripción general:

Primeros pasos con Reaccionar

Léxico es un marco

Trabajar con léxico

Contribuyendo al léxico

Primeros pasos con Reaccionar
Nota: Lexical no solo se limita a React. Lexical puede admitir cualquier biblioteca basada en DOM subyacente una vez que se hayan creado enlaces para esa biblioteca.

Instalar lexicaly @lexical/react:

npm install --save lexical @lexical/react
A continuación se muestra un ejemplo de un editor de texto sin formato básico que utiliza lexicaly @lexical/react( pruébelo usted mismo ).

import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';

const theme = {
  // Theme styling goes here
  // ...
}

// When the editor changes, you can get notified via the
// LexicalOnChangePlugin!
function onChange(editorState) {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const root = $getRoot();
    const selection = $getSelection();

    console.log(root, selection);
  });
}

// Lexical React plugins are React components, which makes them
// highly composable. Furthermore, you can lazy load plugins if
// desired, so you don't pay the cost for plugins until you
// actually use them.
function MyCustomAutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Focus the editor when the effect fires!
    editor.focus();
  }, [editor]);

  return null;
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error) {
  console.error(error);
}

function Editor() {
  const initialConfig = {
    namespace: 'MyEditor',
    theme,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
    </LexicalComposer>
  );
}
Léxico es un marco
El núcleo de Lexical es un marco de editor de texto libre de dependencias que permite a los desarrolladores crear superficies de edición potentes, simples y complejas. Lexical tiene algunos conceptos que vale la pena explorar:

Instancias del editor
Las instancias del editor son lo principal que une todo. Puede adjuntar un elemento DOM editable a las instancias del editor y también registrar oyentes y comandos. Lo más importante es que el editor permite actualizaciones de su archivo EditorState. Puede crear una instancia de editor usando la createEditor()API, sin embargo, normalmente no tiene que preocuparse cuando @lexical/reactse manejan enlaces de marco como este.

Estados del editor
Un estado del editor es el modelo de datos subyacente que representa lo que desea mostrar en el DOM. Los estados del editor contienen dos partes:

un árbol de nodos léxicos
un objeto de selección léxica
Los estados del editor son inmutables una vez creados y, para crear uno, debe hacerlo a través de editor.update(() => {...}). Sin embargo, también puede "engancharse" a una actualización existente mediante transformaciones de nodos o controladores de comandos, que se invocan como parte de un flujo de trabajo de actualización existente para evitar actualizaciones en cascada. Puede recuperar el estado actual del editor usando editor.getEditorState().

Los estados del editor también son completamente serializables a JSON y se pueden volver a serializar fácilmente en el editor usando editor.parseEditorState().

Actualizaciones del editor
Cuando desee cambiar algo en un estado del editor, debe hacerlo a través de una actualización, editor.update(() => {...}). El cierre pasado a la convocatoria de actualización es importante. Es un lugar donde tiene un contexto "léxico" completo del estado del editor activo y expone el acceso al árbol de nodos del estado del editor subyacente. Promovemos el uso $de funciones prefijadas en este contexto, ya que significa un lugar donde se pueden usar exclusivamente. Intentar usarlos fuera de una actualización desencadenará un error de tiempo de ejecución con un error apropiado. Para aquellos familiarizados con React Hooks, puede pensar que estos tienen una funcionalidad similar (excepto $que las funciones se pueden usar en cualquier orden).

Reconciliador DOM
Lexical tiene su propio reconciliador DOM que toma un conjunto de estados del editor (siempre el "actual" y el "pendiente") y les aplica una "diferencia". Luego usa esta diferencia para actualizar solo las partes del DOM que necesitan ser cambiadas. Puede pensar en esto como una especie de DOM virtual, excepto que Lexical puede omitir gran parte del trabajo de diferenciación, ya que sabe qué fue mutado en una actualización determinada. El reconciliador DOM adopta optimizaciones de rendimiento que benefician la heurística típica de un contenido editable y puede garantizar la coherencia para los lenguajes LTR y RTL automáticamente.

Oyentes, transformaciones de nodos y comandos
Además de invocar actualizaciones, la mayor parte del trabajo realizado con Lexical se realiza a través de escuchas, transformaciones de nodos y comandos. Todos estos provienen del editor y tienen el prefijo register. Otra característica importante es que todos los métodos de registro devuelven una función para darse de baja fácilmente. Por ejemplo, así es como escuchas una actualización de un editor léxico:

const unregisterListener = editor.registerUpdateListener(({editorState}) => {
  // An update has occurred!
  console.log(editorState);
});

// Ensure we remove the listener later!
unregisterListener();
Los comandos son el sistema de comunicación utilizado para conectar todo en Lexical. Los comandos personalizados se pueden crear usando createCommand()y enviar a un editor usando editor.dispatchCommand(command, payload). Lexical envía comandos internamente cuando se activan las pulsaciones de teclas y cuando se producen otras señales importantes. Los comandos también se pueden manejar mediante editor.registerCommand(handler, priority), y los comandos entrantes se propagan a través de todos los controladores por prioridad hasta que un controlador detiene la propagación (de forma similar a la propagación de eventos en el navegador).

Trabajar con léxico
Esta sección cubre cómo usar Lexical, independientemente de cualquier marco o biblioteca. Para aquellos que tengan la intención de usar Lexical en sus aplicaciones React, es recomendable consultar el código fuente de los ganchos que se envían en formato@lexical/react .

Creando un editor y usándolo
Cuando trabaja con Lexical, normalmente trabaja con una sola instancia de editor. Se puede pensar en una instancia de editor como la responsable de conectar un EditorState con el DOM. El editor también es el lugar donde puede registrar nodos personalizados, agregar escuchas y transformaciones.

Se puede crear una instancia de editor a partir del lexicalpaquete y acepta un objeto de configuración opcional que permite la creación de temas y otras opciones:

import {createEditor} from 'lexical';

const config = {
  namespace: 'MyEditor',
  theme: {
    ...
  },
};

const editor = createEditor(config);
Una vez que tenga una instancia de editor, cuando esté listo, puede asociar la instancia de editor con un <div>elemento editable de contenido en su documento:

const contentEditableElement = document.getElementById('editor');

editor.setRootElement(contentEditableElement);
Si desea borrar la instancia del editor del elemento, puede pasar null. Alternativamente, puede cambiar a otro elemento si es necesario, simplemente pase una referencia de elemento alternativo a setRootElement().

Trabajar con estados del editor
Con Lexical, la fuente de la verdad no es el DOM, sino un modelo de estado subyacente que Lexical mantiene y asocia con una instancia de editor. Puede obtener el último estado del editor de un editor llamando a editor.getEditorState().

Los estados del editor son serializables a JSON, y la instancia del editor proporciona un método útil para deserializar los estados del editor en forma de cadena.

const stringifiedEditorState = JSON.stringify(editor.getEditorState().toJSON());

const newEditorState = editor.parseEditorState(stringifiedEditorState);
Actualización de un editor
Hay algunas formas de actualizar una instancia del editor:

Activar una actualización coneditor.update()
Configuración del estado del editor a través deeditor.setEditorState()
Aplicar un cambio como parte de una actualización existente a través deeditor.registerNodeTransform()
Usando un oyente de comando coneditor.registerCommand(EXAMPLE_COMMAND, () => {...}, priority)
La forma más común de actualizar el editor es usar editor.update(). Llamar a esta función requiere que se pase una función que proporcione acceso para mutar el estado del editor subyacente. Al iniciar una nueva actualización, el estado actual del editor se clona y se utiliza como punto de partida. Desde una perspectiva técnica, esto significa que Lexical aprovecha una técnica llamada doble búfer durante las actualizaciones. Hay un estado de editor para representar lo que está actualmente en la pantalla y otro estado de editor de trabajo en progreso que representa cambios futuros.

La creación de una actualización suele ser un proceso asincrónico que permite a Lexical agrupar varias actualizaciones en una sola actualización, lo que mejora el rendimiento. Cuando Lexical esté listo para enviar la actualización al DOM, las mutaciones subyacentes y los cambios en la actualización formarán un nuevo estado de editor inmutable. La llamada editor.getEditorState()devolverá el último estado del editor en función de los cambios de la actualización.

Aquí hay un ejemplo de cómo puede actualizar una instancia del editor:

import {$getRoot, $getSelection, $createParagraphNode} from 'lexical';

// Inside the `editor.update` you can use special $ prefixed helper functions.
// These functions cannot be used outside the closure, and will error if you try.
// (If you're familiar with React, you can imagine these to be a bit like using a hook
// outside of a React function component).
editor.update(() => {
  // Get the RootNode from the EditorState
  const root = $getRoot();

  // Get the selection from the EditorState
  const selection = $getSelection();

  // Create a new ParagraphNode
  const paragraphNode = $createParagraphNode();

  // Create a new TextNode
  const textNode = $createTextNode('Hello world');

  // Append the text node to the paragraph
  paragraphNode.append(textNode);

  // Finally, append the paragraph to the root
  root.append(paragraphNode);
});
Si desea saber cuándo se actualiza el editor para poder reaccionar a los cambios, puede agregar un oyente de actualización al editor, como se muestra a continuación:

editor.registerUpdateListener(({editorState}) => {
  // The latest EditorState can be found as `editorState`.
  // To read the contents of the EditorState, use the following API:

  editorState.read(() => {
    // Just like editor.update(), .read() expects a closure where you can use
    // the $ prefixed helper functions.
  });
});
Creación de nodos léxicos personalizados
Creación de nodos decoradores personalizados
Contribuyendo al léxico
Clonar este repositorio

Instalar dependencias

npm install
Iniciar servidor local y ejecutar pruebas

npm run start
npm run test-e2e-chromiumpara ejecutar solo pruebas de cromo e2e
El servidor debe estar funcionando para las pruebas de e2e
npm run startiniciará tanto el servidor de desarrollo como el servidor de colaboración. Si no necesita una colaboración, use npm run devpara iniciar solo el servidor de desarrollo.

Opcional pero recomendado, use VSCode para el desarrollo
Descargar e instalar VSCode

Descargar desde aquí (se recomienda usar la versión sin modificar)
Instalar extensiones

Soporte de lenguaje de flujo
Asegúrese de seguir los pasos de configuración en el LÉAME
más bonita
Establecer más bonito como el formateador predeterminado eneditor.defaultFormatter
Opcional: establecer formato al guardareditor.formatOnSave
ESlint
Documentación
Cómo se diseñó Lexical
Pruebas
Compatibilidad con navegador
Firefox 52+
cromo 49+
Edge 79+ (cuando Edge cambió a Chromium)
Safari 11+
iOS 11+ (Safari)
iPad OS 13+ (Safari)
Android Chrome 72+
Nota: Lexical no es compatible con Internet Explorer ni con las versiones heredadas de Edge.

contribuyendo
Crear una nueva sucursal
git checkout -b my-new-branch
Confirma tus cambios
git commit -a -m 'Description of the changes'
Hay muchas maneras de hacer esto y esto es solo una sugerencia.
Envía tu rama a GitHub
git push origin my-new-branch
Vaya a la página del repositorio en GitHub y haga clic en "Comparar y solicitar extracción"
La CLI de GitHub le permite omitir la interfaz web para este paso (y mucho más)
Soporte
Si tiene alguna pregunta sobre Lexical, le gustaría discutir un informe de error o tiene preguntas sobre nuevas integraciones, no dude en unirse a nosotros en nuestro servidor de Discord .

Los ingenieros léxicos verifican esto regularmente.

Ejecutando pruebas
npm run test-unitejecuta solo pruebas unitarias.
npm run test-e2e-chromiumsolo ejecuta pruebas de cromo e2e.
npm run debug-test-e2e-chromiumejecuta solo pruebas de cromo e2e en modo principal para la depuración.
npm run test-e2e-firefoxsolo ejecuta pruebas de firefox e2e.
npm run debug-test-e2e-firefoxejecuta solo pruebas de firefox e2e en modo principal para la depuración.
npm run test-e2e-webkitejecuta solo pruebas de webkit e2e.
npm run debug-test-e2e-webkitejecuta solo pruebas de webkit e2e en modo principal para la depuración.
Licencia
Lexical tiene licencia del MIT .
