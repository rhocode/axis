from flask import Flask, render_template, request, session
from flask.ext.socketio import SocketIO, emit, join_room, leave_room
import json
import re
import random
import time
from urllib import unquote
import os 
from collections import deque

app = Flask(__name__)

# app.debug=True
app.host='0.0.0.0'
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

@app.route('/')
def index():
	return 'hi'

tutors = {}
tutorExpiration = {}
tutored_class = {}
tutee_queue = {}

TIME_BEFORE_REMOVAL = 60 * 10


class specificFSMQueue:
	def __init__(self):
		self.tutors = []
		self.tutees = []

	def num_tutors(self):
		return len(self.tutors)

	def num_tutees(self):
		return len(self.tutees)

	def service(self):
		if len(self.tutees) > 0:
			retval = self.tutees.pop(0)
			return retval

	def get_tutor(self):
		if len(self.tutors) > 0:
			retval = self.tutors.pop(0)
			return retval

	def remove_tutor(self, roomnum):
		to_remove = None
		for i in self.tutors:
			if (i['tutorRoom'] == roomnum):
				to_remove = i
				break;
		if to_remove != None:
			self.tutors.remove(to_remove)

	def remove_tutee(self, roomnum):
		to_remove = None
		for i in self.tutees:
			if (i['tuteeRoom'] == roomnum):
				to_remove = i
				break;
		if to_remove != None:
			self.tutees.remove(to_remove)


	def add_tutor(self, room, name, location):
		self.tutors.append({'tutorRoom' : room, 'tutorName' : name, 'tutorLocation' : location})

	def add_tutee(self, room, name, location):
		self.tutees.append({'tuteeRoom' : room, 'tuteeName' : name, 'tuteeLocation' : location})


class FSMQueue:
	def __init__(self):
		self.classQueues = {}
		self.roomNumberMax = 0





	def get_room(self):
		if self.roomNumberMax == 10000:
			self.roomNumberMax = 0
			return 0
		self.roomNumberMax = self.roomNumberMax + 1
		return self.roomNumberMax

	def can_service(self, i):
		if i not in self.classQueues:
			return False
		print "200"
		specificQueue = self.classQueues[i]
		if (specificQueue.num_tutees() == 0):
			return False
		print "300"
		return True

	def service(self, i, tutorName, tutorLocation):
		if i in self.classQueues:
			tuteeObj = self.classQueues[i].service()
			tuteeName = tuteeObj['tuteeName']
			tuteeLocation = tuteeObj['tuteeLocation']
			emit('found_tutor', {'name' : tutorName, 'location' : tutorLocation} , room=tuteeObj['tuteeRoom'])
			return tuteeName, tuteeLocation
		return None, None, None


	def offer(self, list_of_classes, tutorName, tutorLocation):
		room_num = self.get_room()
		for i in list_of_classes:
			if i not in self.classQueues:
				self.classQueues[i] = specificFSMQueue()
			self.classQueues[i].add_tutor(room_num, tutorName, tutorLocation)
		return room_num
		#Add to all classes.

	def can_be_tutored(self, i):
		if i not in self.classQueues:
			return False
		print "200"
		specificQueue = self.classQueues[i]
		if (specificQueue.num_tutors() == 0):
			return False
		print "300"
		return True

	def add_tutee(self, i, tutorName, tutorLocation):
		if i not in self.classQueues:
			self.classQueues[i] = specificFSMQueue()
		room_num = self.get_room()
		self.classQueues[i].add_tutee(room_num, tutorName, tutorLocation)
		return room_num
	
	def process_tutor(self, i, tuteeName, tuteeLocation):		
		if i in self.classQueues:
			tutorObj = self.classQueues[i].get_tutor()
			tutorRoom = tutorObj['tutorRoom']
			for j in self.classQueues:
				self.classQueues[j].remove_tutor(tutorRoom)
			tutorName = tutorObj['tutorName']
			tutorLocation = tutorObj['tutorLocation']
			emit('found_tutee', {'tuteeName' : tuteeName, 'tuteeLocation' : tuteeLocation} , room=tutorRoom)
			return tutorName, tutorLocation
		return None, None

	def remove_tutee(self, i, ids):
		if i in self.classQueues:
			self.classQueues[i].remove_tutee(ids)

	def remove_tutor(self, ids):
		for i in self.classQueues:
			self.classQueues[i].remove_tutor(ids)

unifiedQueue = FSMQueue()

class customQueue:
	def __init__(self,subject):
		self.internalRep = []
		self.tutees = set()
		self.SYSLOCK = False #lock variable
		self.current_serve = 0
		self.current_num = 0
		self.assigned = {}

	def enter(self):
		while(self.SYSLOCK):
			pass
		self.SYSLOCK = True

		a = random.randrange(1000, 10000)
		while (a in self.tutees):
			a = random.randrange(1000, 10000)
		self.tutees.add(a)
		self.internalRep.append(a)
		self.SYSLOCK = False
		return a

	def isWaiting(self, tid):
		while(self.SYSLOCK):
			pass
		self.SYSLOCK = True
		present = (tid in self.tutees)
		SYSLOCK = False
		return present


	def myTutor(self, tid):
		while(self.SYSLOCK):
			pass
		self.SYSLOCK = True
		person = None
		location = None
		if tid in self.assigned:
			person = self.assigned[tid][0]
			person = self.assigned[tid][1]
		SYSLOCK = False
		return person, location


	def remove(self, uid):
		while(self.SYSLOCK):
			pass
		self.SYSLOCK = True
		self.internalRep.remove(uid)
		self.tutees.remove(uid)
		self.SYSLOCK = False

	def topAndPop(self, tutor):
		while(self.SYSLOCK):
			pass
		self.SYSLOCK = True
		if (len(self.internalRep) == 0):
			self.SYSLOCK = False
			return
		uid = None
		if len(self.internalRep) > 0:
			uid = self.internalRep[0]
			self.internalRep.remove(uid)
			self.tutees.remove(uid)
			self.assigned[uid] = [tutor[0], tutor[1]]
		self.SYSLOCK = False
		return uid

	def __len__(self):
		return len(self.internalRep)
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
		data.append(json.dumps(j))
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
		num = unquote(request.args.get('num'))
		actualloc = 'PC ' + num
	else:
		actualloc = unquote(request.args.get('loc'))

	subjs = unquote((request.args.get('sub')))
	allsubs = sorted(set(subjs.upper().replace(' ', '').split(',')), key=classComparator)
	passw = unquote((request.args.get('pass')))

	if passw != password:
		return returnData({'status' : 'failed'})

	if name not in tutors:
		tutorCode = random.randrange(1000, 10000)
		for i in allsubs:
			if i not in tutored_class:
				tutored_class[i] = 1;
				if i not in tutee_queue:
					tutee_queue[i] = customQueue(i)
			else:
				tutored_class[i] = tutored_class[i] + 1;
	else:
		tutorCode = tutors[name]['tid']
	tutors[name] = {'location' : actualloc, 'subjects' : ','.join(allsubs), 'tid': tutorCode, 'subjlist': allsubs}
	tutorExpiration[tutorCode] = int(time.time()) + TIME_BEFORE_REMOVAL

		
	return returnData({'status' : 'success', 'tutorcode' : str(tutorCode), 'subjects' : "'" + ','.join(allsubs) + "'"})
	
@app.route('/keepalive.html')
def keepalive():
	tutorid = int(unquote((request.args.get('tutorid'))))
	#todo: keepalive
	
	if tutorid in tutorExpiration:
		tutorExpiration[tutorid] = int(time.time()) + TIME_BEFORE_REMOVAL
		print('Keepalive seen.', tutorExpiration, tutorid)
		return returnData({'status' : 'success'})
	else:
		return returnData({'status' : 'failure'})

@app.route('/table.html')
def displayTable():
	dict_list = []
	to_remove = []
	for i in tutors.keys():
		retrieve = tutors[i]
		print(tutorExpiration[retrieve['tid']], int(time.time()))
		if tutorExpiration[retrieve['tid']] <= int(time.time()):
			to_remove.append(i)
			for c in retrieve['subjlist']:
				if c in tutored_class and tutored_class[c]  == 1:
					tutored_class.pop(c)
				elif c in tutored_class:
					tutored_class[c] = tutored_class[c] - 1;
			print('Popped ' + i)
		else:
			dict_list.append({'name' : i, 'location' : retrieve['location'], 'subjects' : retrieve['subjects'], 'tutorID' : retrieve['tid']})
	for i in to_remove:
		tutorExpiration.pop(tutors[i]['tid'], None)
		tutors.pop(i, None)
	return returnDataList(dict_list)


@socketio.on('my event', namespace='/test')
def test_message(message):
	emit('my response', {'data': message['data']})

@socketio.on('my broadcast event', namespace='/test')
def test_message(message):
	emit('my response', {'data': message['data']}, broadcast=True)

@socketio.on('request_spot')
def request_spot(cid):
	cid = str(cid['data'])
	if cid in tutee_queue:
		thisQueue = tutee_queue[cid]
		session['id'] = thisQueue.enter()
		session['cid'] = cid
		if cid in tutored_class:
			tutorsavail = tutored_class[cid]
		else:
			tutorsavail = 0
		emit('tutors_for_subj', {'tutors': tutorsavail})

@socketio.on('wait_spot')
def wait_spot():
	cid = session['cid']
	if cid in tutee_queue:
		thisQueue = tutee_queue[cid]
		while (thisQueue.isWaiting(session['id'])):
			# time.sleep(5)
			pass
		tutor, location = myTutor(session['id'])
		emit('found_tutor', {'tutor': tutor, 'location': location})	



@socketio.on('tutor_setup')
def tutor_connection(data):
	session['type'] = 'tutor'
	session['name'] = data['name']
	session['location'] = data['location']
	session['tid'] = data['tid']
	session['subjects'] = data['subjects']
	
	print('Tutor ' +  data['name'] + ' ' + data['tid'] + ' added ' + data['subjects'])
	emit('tutor_connected', {'status': 'success'})





@socketio.on('tutee_setup')
def tutee_connection(data):
	session['type'] = 'tutee'
	session['name'] = data['tuteeName']
	session['location'] = data['tuteeLocation']
	session['subjects'] = data['tuteeClass']
	
	print('Tutee ' +  session['name'] + ' added ' + session['subjects'])
	
	if (unifiedQueue.can_be_tutored(session['subjects'])):
		print("SO COOLLLLLLLLLLLL")
		name, location = unifiedQueue.process_tutor(session['subjects'], session['name'], session['location'])
		print(name, location)
		print('HELLO')
		emit('found_tutor', {'name' : name, 'location' : location})
	else:
		room = unifiedQueue.add_tutee(session['subjects'], session['name'], session['location'])
		join_room(room)
		emit('tutee_queue_status', {'status' : 'All current tutors are occupued.', 'tid' : room, 'myclass' : session['subjects']})


@socketio.on('force_tutee_remove')
def tutee_remove(data):
	print(data)
	tid = data['tuteeID']
	tclass = data['myclass']
	unifiedQueue.remove_tutee(tclass, tid)

@socketio.on('force_tutor_remove')
def tutor_remove(data):
	tid = data['tutorRoom']
	print(tid)
	unifiedQueue.remove_tutor(tid)




@socketio.on('ready_to_tutor')
def tutor_ready():
	for i in session['subjects'].split(','):
		if unifiedQueue.can_service(i):
			tuteeName, tuteeLocation = unifiedQueue.service(i, session['name'], session['location'])
			emit('found_tutee', {'tuteeName' : tuteeName, 'tuteeLocation' : tuteeLocation})
			return
	room = unifiedQueue.offer(session['subjects'].split(','), session['name'], session['location'])
	join_room(room)
	print('Joined room since no tutees')
	emit('no_tutees', {'data' : room}, room=room)
	# session['type'] = 'tutor'
	# session['name'] = data['name']
	# session['location'] = data['location']
	# session['tid'] = data['tid']
	# print('Tutor ' +  data['name'] + ' ' + data['tid'] + ' added')
	# emit('tutor_connected', {'status': 'success'})	


@socketio.on('tutor_connect')
def tutor_connect(data):
	session['tid'] = data['tutorID']
	print('emitting tutor_connected')
	emit('tutor_connected', {'status': 'success'})	










@socketio.on('can_tutor')
def can_tutor():
	print tutors
	print "GDNSJGFSG"
	for i in tutors:
		for j in tutors[i][3]:
			#This is kinda dumb. The lower level courses get priority over higher levels.
			if j in tutee_queue:
				result = tutee_queue[j].topAndPop([i, tutors[i][0]])
				if (result):
					print("FOUND TUTEE")
					emit('found_tutee')	
					return

@socketio.on('connect')
def connected_client():
	print('Client connected.')

@socketio.on('disconnect')
def test_disconnect():
	print('Client disconnected')

if __name__ == '__main__':
	app.host='0.0.0.0'
	# app.debug=True
	app.port="5000"
	socketio.run(app, host="0.0.0.0", debug=True)