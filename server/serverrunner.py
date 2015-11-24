from flask_failsafe import failsafe
from flask.ext.socketio import SocketIO, emit
from server import socketio, app


@failsafe
def create_app():
  # note that the import is *inside* this function so that we can catch
  # errors that happen at import time
  return socketio

if __name__ == "__main__":
  create_app().run(app, host='0.0.0.0')