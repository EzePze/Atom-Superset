from . import SupersetSecurityManager
from flask_appbuilder.security.sqla.models import User
from flask_appbuilder.security.registerviews import BaseRegisterUser
from flask_appbuilder.views import expose
from sqlalchemy import Column, String, Integer, Sequence
from sqlalchemy import Boolean
from flask import request
from web3 import Web3
from hexbytes import HexBytes
from eth_account.messages import encode_defunct

class Web3User(User):
    """
    Extends the User model to store web3 authentication information
    """
    nonce = Column(String(255), default=None)
    display_name = Column(String(255), default=None)


class Web3RegisterUser(BaseRegisterUser):
    """
    Handles the registration of a new user via web3
    """
    
    @expose("/register/", methods=[ "POST"])
    def register(self):
        """
        Registers a new user
        """
        signature = request.form.get("signature")
        address = request.form.get("address")
        w3 = Web3(Web3.HTTPProvider(""))
        nonce = self.appbuilder.sm.get_nonce_by_address(address)
        message = encode_defunct(text=nonce)
        recovered_address = w3.eth.account.recover_message(message, signature=HexBytes(signature))
        if recovered_address != address:
            return self.response(400, message="Invalid signature")
        user = self.appbuilder.sm.add_user(
            nonce=nonce,
            address=address,
        )
        return self.response(200, message="User registered")

class Web3SecurityManager(SupersetSecurityManager):
    """
    Extends the base superset security manager to allow for web3 authentication via nonce signing
    """
    user_model = Web3User
    registeruser_model = Web3User

    def get_nonce_by_address(self, address):
        """
        Returns the nonce for a given address
        """
        return self.find_user(address=address).nonce

