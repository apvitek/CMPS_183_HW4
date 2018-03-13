const initPageElements = () => {
    return {
        todoList: document.getElementById('todolist'),
        taskTemplate: document.getElementById('task-template').firstElementChild,
        editTemplate: document.getElementById('edit-task-template').firstElementChild,
        newList: document.getElementById('newlist'),
        formCount: 0
    }
};

let pageElements;
let localCache = [];

const init = () => {
    // tasks load asynchronously with rest of init()
    loadTasks();

    // convenience object with references to key DOM objects and the form counter
    pageElements = initPageElements();

    // attach event handlers to controls in right sidebar
    // to controls
    document.querySelector('.controls')
        .addEventListener('click', (event) => {
            if (event.target.closest('INPUT.controlbtn')) {
                if (event.target.closest('INPUT.controlbtn').value === "New task") {
                    handleNewTask(event)

                } else if (event.target.closest('INPUT.controlbtn').value === "Filter") {
                    let taskFilter = "";

                    if (document.getElementById("checkAll").checked) {
                        taskFilter = "all";

                    } else if (document.getElementById("checkDone").checked) {
                        taskFilter = "done";

                    } else {
                        taskFilter = "tbd";
                    }

                    getTasks(taskFilter)
                        .then(rsp => {
                            return rsp.json()
                        })
                        .then(tasks => {
                            localCache = tasks;
                            pageElements.todoList.innerHTML = "";
                            createTaskElements(tasks);
                        })
                }
            }
        });

    // to new tasks being edited
    document.querySelector('#newlist')
        .addEventListener('click', (event) => {
            // you can remove the diagnostic console.log and alert statements
            // console.log("event:");
            // console.log(event);
            // alert("Check browser console for console.log messages");

            if (event.target.closest('INPUT.editbtn')) {
                handleNewTaskSave(event);
                // pageElements.newList.appendChild()
            }

            if (event.target.closest('INPUT.deletebtn')) {
                handleNewTaskCancel(event);
            }
        });

    document.querySelector('#todolist')
        .addEventListener('click', (event) => {
            if (event.target.closest('INPUT.status')) {
                // console.log("task checked? " + event.target.checked);
                status = (event.target.checked ? "done" : "tbd");
                // console.log('status: ' + status);
                let nextElement = event.target.closest('SECTION.todoitem').nextSibling;

                let taskid = event.target.closest('SECTION.todoitem').children[0].value;

                if (taskid === ""){
                    taskid = parseInt(nextElement.children[0].value);
                }
                // console.log('taskid: ' + taskid);

                postData('/status/update', {'taskid': taskid, 'status': status})
                    .then(response => {
                        // console.log("before reading body of postData response:");
                        // console.log(response);

                        let message = response.json();

                        // console.log("after reading body of postData response:");
                        // console.log(response);
                        // console.log("message read from response body: ");
                        // console.log(message);

                        return message;
                    })
                    .then(reply => {
                        // console.log("reply that resolved promise:");
                        // console.log(reply);

                        if (reply.error) {
                            alert("Server Error: " + reply.error)
                        }
                    })
                    // catch errors not caught by server-side application 
                    .catch(error => console.log(error))
            }

            // addition eventListeners go here for clicks of buttons
            // Edit, Delete
            // Save and Cancel (these on the form created click on Edit)
            if (event.target.closest('INPUT.editbtn')) {
                if (event.target.value === "Edit") {
                    console.log("Edit pressed");
                    let parentElement = event.target.closest('SECTION.todoitem');

                    let taskID = parseInt(parentElement.children[0].value);
                    const existingTask = localCache.filter(task => task["taskid"] === taskID)[0];

                    handleExistingTask(event, parentElement, existingTask);
                     // handleTaskDelete(event, taskID);

                } else {
                    let toDoForm = event.target.closest('SECTION.todoitem');
                    let parentElement = event.target.closest('SECTION.todoitem');
                    let nextElement = event.target.closest('SECTION.todoitem').nextSibling;

                    let text = event.target.closest('SECTION.todoitem').getElementsByTagName("textarea")[0].value;
                    let taskID = parseInt(nextElement.children[0].value);
                    localCache.filter(task => task["taskid"] === taskID)[0].taskdescription = text;
                    localCache.filter(task => task["taskid"] === taskID)[0].status = (event.target.checked ? "done" : "tbd");
                    nextElement.children[2].children[0].children[0].checked =
                        event.target.closest('SECTION.todoitem').children[2].children[0].children[0].checked;

                    let task = {
                        taskid: taskID,
                        taskdescription: text,
                        status: getStatus(toDoForm)
                    };
                    const childIndex = findChildIndex(parentElement);
                    let x = document.getElementById("todolist").children[childIndex].getElementsByClassName("taskdescription");
                    x[0].innerHTML = text;
                    document.getElementById("todolist").children[childIndex].style = "display: display";
                    saveTask(task);
                    toDoForm.remove();
                    console.log("Save pressed");

                }

            } else if (event.target.closest('INPUT.deletebtn')) {
                if (event.target.value === "Delete") {
                    console.log("Delete pressed");
                    let parentElement = event.target.closest('SECTION.todoitem');
                    let taskID = parseInt(parentElement.children[0].value);

                    handleTaskDelete(event, taskID);

                } else {
                    console.log("Cancel pressed");
                    let toDoForm = event.target.closest('SECTION.todoitem');
                    let parentElement = event.target.closest('SECTION.todoitem');

                    const childIndex = findChildIndex(parentElement);
                    document.getElementById("todolist").children[childIndex].style = "display: display";

                    toDoForm.remove()
                }
            }
        });
};

function localCacheIndexOf(taskID){
    for (var i = 0 ; i < localCache.length; i++){
        if (localCache[i].taskid === parseInt(taskID)){
            return i;
        }
    }

    return -1;
}

function findChildIndex(node) {
    let i = 1;

    while (node = node.previousSibling) {
        if (node.nodeType === 1) {
            ++i
        }
    }

    return i;
}

const loadTasks = () => {
    getTasks("all")
        .then(rsp => {
            return rsp.json()
        })
        .then(tasks => {
            // console.log("resolving promise in loadTasks response:");
            // console.log(tasks);
            localCache = tasks;
            createTaskElements(tasks);
        })
};

const getTasks = (filter) => {
    return fetch("/tasks/" + filter, {
        // set headers to let server know format of
        // request and response bodies
        headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        }
    })
};

const putTask = (task) => {
    // console.log("from putTask, task:");
    // console.log(task);

    return fetch('/task/new', {
        // represent JS object as a string
        body: JSON.stringify(task),

        // set headers to let server know format of 
        // request and response bodies
        headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        },

        // in the ReST spirit method should be PUT
        // but bottle does not support HTTP verb PUT
        method: 'POST'
    })
};

const deleteTask = (task) => {
    console.log(JSON.stringify(task));

    return fetch('/task/delete', {
        // represent JS object as a string
        body: JSON.stringify(task),

        // set headers to let server know format of
        // request and response bodies
        headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        },

        // in the ReST spirit method should be PUT
        // but bottle does not support HTTP verb PUT
        method: 'POST'
    })
};

const postTask = (task) => {
    // console.log("from postTask, task:");
    // console.log(task);

    return postData('/task/update/', task)
};

const saveTask = (task) => {
    console.log(task);
    console.log(JSON.stringify(task));

     return fetch('/task/edit', {
        // represent JS object as a string
        body: JSON.stringify(task),

        // set headers to let server know format of
        // request and response bodies
        headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        },

        // in the ReST spirit method should be PUT
        // but bottle does not support HTTP verb PUT
        method: 'POST'
    })
};

function postData(url, jsondata) {
    return fetch(url, {
        body: JSON.stringify(jsondata),
        headers: {
            'Accept': 'application/json',
            'Content-type': 'application/json'
        },
        method: 'POST'
    })
}

// functions for building and manipulating DOM

const createTaskElements = (taskListData) => {
    // console.log("from createTaskElements: creating task elements");
    taskListData.forEach(createAndAppendTaskElement)
};

const createTaskElement = (task) => {
    // cloneNode(true) makes a deep clone (as opposed to shallow clone)
    let taskElement = pageElements.taskTemplate.cloneNode(true);
    updateTaskElement(task, taskElement);

    return taskElement
};

const updateTaskElement = (task, taskElement) => {
    setTaskId(taskElement, task.taskid);
    setTaskDescription(taskElement, task.taskdescription);
    setStatus(taskElement, task.status);
};

const appendTaskElement = (taskElement) => {
    pageElements.todoList.appendChild(taskElement);
};

// poor (wo)man's function composition
const createAndAppendTaskElement = (taskElement) => {
    appendTaskElement(createTaskElement(taskElement))
};

const setTaskId = (taskElement, taskid) => {
    let taskidEl = taskElement.querySelector('.taskid');
    taskidEl.value = taskid;
};

const getTaskId = (taskElement) => {
    let taskidEl = taskElement.querySelector('.taskid');
    return taskidEl.value
};

const setTaskDescription = (taskElement, taskdescription) => {
    let taskDescriptionEl = taskElement.querySelector('.taskdescription');
    taskDescriptionEl.innerHTML = taskdescription;
};

const getTaskFormDescription = (taskElement) => {
    let taskDescriptionEl = taskElement.querySelector('.taskdescription');
    return taskDescriptionEl.firstElementChild.value
};

const getTaskDescription = (taskElement) => {
    let taskDescriptionEl = taskElement.querySelector('.taskdescription');
    return taskDescriptionEl.innerHTML
};

const setStatus = (taskElement, status) => {
    let taskStatusEl = taskElement.querySelector('.status');

    if (status === "done") {
        taskStatusEl.checked = true;
    }
};

const getStatus = (taskElement) => {
    let taskStatusEl = taskElement.querySelector('.status');
    return (taskStatusEl.checked ? "done" : "tbd")
};

const editNewTask = () => {
    let taskFormEl = pageElements.editTemplate.cloneNode(true);
    setFormId(taskFormEl);
    pageElements.newList.appendChild(taskFormEl);
};

const editExistingTask = (existingToDoHTML, toDo) => {
    let taskFormEl = pageElements.editTemplate.cloneNode(true);
    setExistingFormId(taskFormEl, toDo);

    pageElements.todoList.insertBefore(taskFormEl, existingToDoHTML);
    existingToDoHTML.style.display = "none";
};

const setFormId = (taskFormElement) => {
    // create unique (within DOM) form id
    pageElements.formCount += 1;

    let formid = "form-" + pageElements.formCount;

    // set form id in form elements and form
    taskFormElement.querySelector('.taskid').form = formid;
    taskFormElement.querySelector('.taskdescription').firstElementChild.form = formid;
    taskFormElement.querySelector('.status').form = formid;
    taskFormElement.querySelector('.editbtn').form = formid;
    taskFormElement.querySelector('FORM').id = formid;
};

const setExistingFormId = (taskFormElement, toDo) => {
    // create unique (within DOM) form id
    pageElements.formCount += 1;

    let formid = "form-" + pageElements.formCount;

    // set form id in form elements and form
    taskFormElement.querySelector('.taskid').form = formid;
    taskFormElement.querySelector('.taskdescription').firstElementChild.form = formid;
    taskFormElement.querySelector('.status').form = formid;
    taskFormElement.querySelector('.editbtn').form = formid;
    taskFormElement.querySelector('FORM').id = formid;

    taskFormElement.getElementsByTagName("textarea")[0].innerHTML = toDo["taskdescription"];

    if (toDo["status"] === "done") {
        taskFormElement.getElementsByClassName("status")[0].checked = true;
    }
};

// event handling functions

const handleNewTask = (event) => {
    editNewTask();
};

const handleExistingTask = (event, existingTodoHTML, toDo) => {
    editExistingTask(existingTodoHTML, toDo);
};

const handleNewTaskSave = (event) => {
    let taskFormEl = event.target.closest('section.todoitem');

    let task = {
        taskdescription: getTaskFormDescription(taskFormEl),
        status: getStatus(taskFormEl)
    };

    putTask(task)
        .then(rsp => {
            // console.log("before reading putTask response body");
            // console.log(rsp);
            let payload = rsp.json();
            // console.log("after reading putTask response body");
            // console.log(rsp);
            console.log("payload:");
            console.log(payload);
            return payload
        })
        .then(task => {
            // console.log("task resolving promise:");
            // console.log(task);
            appendTaskElement(createTaskElement(task));
            localCache.push(task);
            taskFormEl.remove();
        })
};


const handleNewTaskCancel = (event) => {
    let taskFormEl = event.target.closest('section.todoitem');
    taskFormEl.remove()
};

const handleTaskDelete = (event, taskID) => {
    let taskFormEl = event.target.closest('section.todoitem');

    let description;

    let taskDescriptionEl = taskFormEl.querySelector('.taskdescription');
    description = taskDescriptionEl.innerHTML;

    let task = {
        taskid: taskID,
        taskdescription: description,
        status: getStatus(taskFormEl)
    };

    localCache.splice(localCacheIndexOf(taskID),1);

    deleteTask(task)
        .then(rsp => {
            console.log("before reading putTask response body");
            console.log(rsp);
            let payload = rsp.json();
            console.log("after reading putTask response body");
            console.log(rsp);
            console.log("payload:");
            console.log(payload);
            return payload
        })
        .then(task => {
            // console.log("task resolving promise:");
            // console.log(task);
            // createTaskElement(task);
            taskFormEl.remove();
        })
};

init();


