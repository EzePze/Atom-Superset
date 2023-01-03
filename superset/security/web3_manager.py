from . import SupersetSecurityManager
from flask_appbuilder.security.sqla.models import User, RegisterUser
from flask_appbuilder.security.registerviews import BaseRegisterUser
from flask_appbuilder.security.views import AuthDBView, UserDBModelView
from flask_babel import lazy_gettext
from flask_appbuilder.views import expose
from sqlalchemy import Column, String, Integer, Sequence
from sqlalchemy import Boolean
from flask import request, redirect, g
from web3 import Web3
from hexbytes import HexBytes
from eth_account.messages import encode_defunct
from uuid import uuid4
from flask_login import login_user, LoginManager
from superset.security.manager import SupersetSecurityListWidget
from superset.constants import RouteMethod
from flask import Response
from flask import jsonify
import json

def generate_nonce():
    return f"Sign this nonce to log in: {str(uuid4())}"

class Web3User(User):
    """
    Extends the User model to store web3 authentication information
    """
    __tablename__ = "ab_user"
    nonce = Column(String(255), default=None)
    address = Column(String(255), default=None)

class Web3UserDBModelView(UserDBModelView):
    """
    Extends the UserDBModelView to allow for web3 authentication
    """

    list_columns = ["username", "first_name", "last_name", "email", "active", "login_count", "roles", "nonce", "address"]
    add_columns = ["username", "first_name", "last_name", "email", "active", "roles", "nonce", "address"]
    edit_columns = ["username", "first_name", "last_name", "email", "active", "roles", "nonce", "address"]
    show_columns = ["username", "first_name", "last_name", "email", "active", "login_count", "roles", "nonce", "address"]

    list_widget = SupersetSecurityListWidget

    include_route_methods = RouteMethod.CRUD_SET | {
    RouteMethod.ACTION,
    RouteMethod.API_READ,
    RouteMethod.ACTION_POST,
    "userinfo",
}


class Web3AuthDBView(AuthDBView):
    """
    Extends the base superset auth view to allow for web3 authentication via nonce signing
    """
    @expose("/login/", methods=["GET"])
    def login(self):
        """
        Handles the login request
        """
        if g.user and g.user.is_authenticated:
            return redirect(self.appbuilder.get_url_for_index)
        address = request.args.get("address")
        signature = request.args.get("signature")
        if not address or not signature:
            return super(Web3AuthDBView, self).login()
        if address and signature:
            w3 = Web3(Web3.HTTPProvider(""))
            user = self.appbuilder.sm.find_user_by_address(address)
            if not user:
                return Response("User not found", status=400)
            nonce = user.nonce
            message = encode_defunct(text=nonce)
            recovered_address = w3.eth.account.recover_message(message, signature=HexBytes(signature))
            if recovered_address != address:
                return Response("Invalid signature", status=400)
            login_user(user)
            return Response("OK", status=200)
            

    @expose("/get_nonce/", methods=["GET"])
    def get_nonce(self):
        """
        Returns a nonce for a given address
        """
        nonce = generate_nonce()
        address = request.args.get("address")
        if not address:
            return Response("Address is required", status=400)
        user = self.appbuilder.sm.find_user_by_address(address)
        if user:
            user.nonce = nonce
            self.appbuilder.sm.update_user(user)
        else:
            user = self.appbuilder.sm.add_user(
                nonce=nonce,
                address=address,
                username=address,
            )
        return jsonify({"nonce": nonce})

class Web3SecurityManager(SupersetSecurityManager):
    """
    Extends the base superset security manager to allow for web3 authentication via nonce signing
    """
    user_model = Web3User
    usermodeldbview = Web3UserDBModelView
    authdbview = Web3AuthDBView

    def __init__(self, appbuilder):
        super(Web3SecurityManager, self).__init__(appbuilder)

    def find_user_by_address(self, address=None):
        """
        Returns the user for a given address
        """
        return self.get_session.query(self.user_model).filter_by(address=address).first()

    def add_user(self, nonce=None, address=None, username=None, first_name="", last_name="", email="", role='Public'):
        """
        Adds a new user to the database
        """
        user = self.user_model()
        user.nonce = nonce
        user.address = address
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.active = True
        user.roles = [self.find_role(role)]
        self.get_session.add(user)
        self.get_session.commit()
        return user

