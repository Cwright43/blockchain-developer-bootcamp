// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract Exchange {
	address public feeAccount;
	uint256 public feePercent;
	mapping(address => mapping(address => uint256)) public tokens;
	mapping(uint256 => _Order) public orders;
	uint256 public orderCount;


	event Deposit(
		address token, 
		address user, 
		uint256 amount, 
		uint256 balance);

	event Withdraw(
		address token, 
		address user, 
		uint256 amount, 
		uint256 balance
		);

	event Order (
		uint256 id,     
		address user,     
		address tokenGet,  
		uint256 amountGet, 
		address tokenGive,   
		uint256 amountGive,   
		uint256 timestamp
		);

	struct _Order {
		// Attributes of an order
		uint256 id;      // Unique identifier for order
		address user;     // User who made the order
		address tokenGet;  // Address of token they RECEIVE
		uint256 amountGet;  // Amount they RECEIVE
		address tokenGive;   // Address of token they GIVE
		uint256 amountGive;   // Amount they GIVE
		uint256 timestamp;  // Time when order was created
	}

	constructor(address _feeAccount, uint256 _feePercent) {
		feeAccount = _feeAccount;
		feePercent = _feePercent;
	}
	// -----------------------------------
	// Deposit BIATCH & Withdraw BIATCH

	function depositToken(address _token, uint256 _amount) public {

		// Transfer => XC
		require(Token(_token).transferFrom(msg.sender, address(this), _amount));

		// Update balance
		tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;

		// Event Signal
		emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
	}

	function withdrawToken(address _token, uint256 _amount) public {
		// Make sure user has enough tokens to withdraw
		require(tokens[_token][msg.sender] >= _amount);

		// Transfer tokens to user
		Token(_token).transfer(msg.sender, _amount);

		// Update user balance
		tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;


		// Emit event
		emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
	}

	function balanceOf(address _token, address _user)
			public
			view
			returns(uint256)
			{
				return tokens[_token][_user];
	}

	//------------------
	//Make & Cancel Orders

	function makeOrder(
		address _tokenGet, 
		uint256 _amountGet, 
		address _tokenGive, 
		uint256 _amountGive
		) public {

		// Require token balance
		require(balanceOf(_tokenGive, msg.sender) >= _amountGive);

		// Instantiate a new order
		orderCount = orderCount + 1;
		orders[orderCount] =_Order(
			orderCount, 
			msg.sender, 
			_tokenGet, 
			_amountGet, 
			_tokenGive, 
			_amountGive, 
			block.timestamp
		);

		// Emit event

		emit Order(
			orderCount, 
			msg.sender, 
			_tokenGet, 
			_amountGet, 
			_tokenGive, 
			_amountGive, 
			block.timestamp
		);
	}

}
