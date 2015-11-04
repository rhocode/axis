from flask import Flask, request, current_app
from functools import wraps
from urllib import parse
import json
import re
import random
import time

app = Flask(__name__)

"""
Taken from:  https://gist.github.com/1094140
"""
tutors = {}

TIME_BEFORE_REMOVAL = 60 * 10
password = open('passw', 'r').readline().replace('\n', '')

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
@app.route('/')
def hello_world():
    return 'One big kek'

@app.route('/login.html')
def login():
    name = re.sub("\s\s+" , " ", request.args.get('name').title())

    if request.args.get('loc') == None:
    	num = parse.unquote(request.args.get('num'))
    	actualloc = 'PC ' + num
    else:
    	actualloc = parse.unquote(request.args.get('loc'))

    subjs = parse.unquote((request.args.get('sub')))
    passw = parse.unquote((request.args.get('pass')))

    if passw != password:
        return returnData({'status' : 'failed'})

    if name not in tutors.keys():
    	tutorCode = random.randrange(1000, 10000)
    	
    else:
    	tutorCode = tutors[name][2]
    tutors[name] = (actualloc, subjs, tutorCode, int(time.time()) + TIME_BEFORE_REMOVAL)
    print (tutors[name])

    	
    return returnData({'status' : 'success', 'tutorcode' : str(tutorCode)})
    
@app.route('/keepalive.html')
def keepalive():
    subjs = parse.unquote((request.args.get('tutorid')))

    #todo: keepalive
    return returnData({'status' : 'success'})
    
        
@app.route('/table.html')
def displayTable():
	dict_list = []
	to_remove = []
	print(int(time.time()))
	for i in tutors.keys():
		retrieve = tutors[i]
		if retrieve[3] <= int(time.time()):
			to_remove.append(i)
			print('Popped ' + i)
		else:
			dict_list.append({'name' : i, 'location' : retrieve[0], 'subjects' : retrieve[1], 'tutorID' : retrieve[2]})
	for i in to_remove:
		tutors.pop(i, None)
	return returnDataList(dict_list)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)

    
