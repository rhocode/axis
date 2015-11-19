from flask import Flask, render_template, request
from flask.ext.socketio import SocketIO, emit
import json
import re
import random
import time
import urlparse
import os 

app = Flask(__name__)

app.debug=True
app.host='0.0.0.0'
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

@app.route('/')
def index():
    while 1 == 1:
        print 'a'
    return 'hi'


tutors = {}
tutorExpiration = {}
tutored_class = {}
tutee_queue = {}

TIME_BEFORE_REMOVAL = 60 * 10

try:
    password = open(os.path.dirname(__file__) + 'passw', 'r').readline().replace('\n', '')
except Exception as e:
    password = open(os.path.dirname(__file__) + '/passw', 'r').readline().replace('\n', '')

def classComparator(x):
    match = re.match(r"([0-9]+)([a-z]*)", x.lower(), re.I)
    number = 0
    if match:
        items = match.groups()
        number = int(items[0]) * 100
        for i in items[1]:
            number = number + ord(i)
    return number

def returnDataList(list_of_dict):
    data = []
    for j in list_of_dict:
        localdata = []
        for i in j.keys():
            json =  "'" + i + "': "
            retrieveKey = j[i]
            if type(retrieveKey) == str:
                json = json + "'" + retrieveKey + "'"
            else:
                json = json + str(retrieveKey)
            localdata.append(json)
        localdata = '{' + ','.join(localdata) + '}'
        data.append(localdata)
    return "%s({data: [" % str(request.args.get('callback')) + str(','.join(data)) + "]})" 

def returnData(dictionary):
    data = []
    for i in dictionary.keys():
        json =  "'" + i + "': "
        retrieveKey = dictionary[i]
        if type(retrieveKey) == str:
            json = json + "'" + retrieveKey + "'"
        else:
            json = json + str(retrieveKey)
        data.append(json)
    return "%s({" % str(request.args.get('callback')) + str(','.join(data)) + "})" 


@app.route('/tutoredsubjs.html')
def currentSubjects():
    subjlist = []
    for i in sorted(tutored_class.keys(), key=classComparator):
        if i in tutee_queue:
            queuelength = len(tutee_queue[i])
        else:
            queuelength = 0
        subjlist.append({'subject': i, 'tutors' :tutored_class[i], 'queue' : queuelength})
    return returnDataList(subjlist)

@app.route('/login.html')
def login():
    name = re.sub("\s\s+" , " ", request.args.get('name').title())

    if request.args.get('loc') == None:
        num = parse.unquote(request.args.get('num'))
        actualloc = 'PC ' + num
    else:
        actualloc = parse.unquote(request.args.get('loc'))

    subjs = parse.unquote((request.args.get('sub')))
    allsubs = sorted(set(subjs.upper().replace(' ', '').split(',')), key=classComparator)
    passw = parse.unquote((request.args.get('pass')))

    if passw != password:
        return returnData({'status' : 'failed'})

    if name not in tutors:
        tutorCode = random.randrange(1000, 10000)
        for i in allsubs:
            if i not in tutored_class:
                tutored_class[i] = 1;
            else:
                tutored_class[i] = tutored_class[i] + 1;
    else:
        tutorCode = tutors[name][2]
    tutors[name] = (actualloc, ', '.join(allsubs), tutorCode, allsubs)
    tutorExpiration[tutorCode] = int(time.time()) + TIME_BEFORE_REMOVAL
    print (tutorCode, tutorExpiration[tutorCode])
    print (tutors[name])

        
    return returnData({'status' : 'success', 'tutorcode' : str(tutorCode)})
    
@app.route('/keepalive.html')
def keepalive():
    tutorid = parse.unquote((request.args.get('tutorid')))
    #todo: keepalive
    if int(tutorid) in tutorExpiration.keys():
        tutorExpiration[tutorid] = int(time.time()) + TIME_BEFORE_REMOVAL
        return returnData({'status' : 'success'})
    else:
        return returnData({'status' : 'failure'})


@app.route('/table.html')
def displayTable():
    dict_list = []
    to_remove = []
    for i in tutors.keys():
        retrieve = tutors[i]
        if tutorExpiration[retrieve[2]] <= int(time.time()):
            to_remove.append(i)
            for c in retrieve[3]:
                if c in tutored_class and tutored_class[c]  == 1:
                    tutored_class.pop(c)
                elif c in tutored_class:
                    tutored_class[c] = tutored_class[c] - 1;
            print('Popped ' + i)
        else:
            dict_list.append({'name' : i, 'location' : retrieve[0], 'subjects' : retrieve[1], 'tutorID' : retrieve[2]})
    for i in to_remove:
        tutorExpiration.pop(tutors[i][2], None)
        tutors.pop(i, None)
    print (tutored_class)
    return returnDataList(dict_list)

@app.route('/derp.html')
def in2():
    return 'hi'

@socketio.on('my event', namespace='/test')
def test_message(message):
    emit('my response', {'data': message['data']})

@socketio.on('my broadcast event', namespace='/test')
def test_message(message):
    emit('my response', {'data': message['data']}, broadcast=True)

@socketio.on('client_connected')
def client_connect(message):
    print(message)
    emit('client_connected2', 'Millions')

@socketio.on('connect')
def test_disconnect():
    print('Client connected 1.')

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    app.host='0.0.0.0'
    app.debug=True
    app.port="5000"
    socketio.run(app, host="0.0.0.0", debug=True)