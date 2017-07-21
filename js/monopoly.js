var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 150;
Monopoly.doubleCounter = 0;

Monopoly.init = function(){
    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();        
    });
};
//Starting the game
Monopoly.start = function(){
    Monopoly.showPopup("intro")
};

//Initializing the dices
Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};

//Getting the player that is playing
Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};
//Getting the cell the player is standing on
Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};

//Getting the money the player has & converting the money from string to integer
Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};
//Updating the money of the player by deducting his last amount spent & kicking out the player of the game if broke
Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0 ){
        Monopoly.showPopup("broke");
        player.hide();
        player.addClass("out");
        var popup = $("#broke");
        popup.find("button").unbind("click").bind("click",function(){
            Monopoly.handleAction(player,"broke");
            var playerId = player.attr("id");
             var playerDiv = $("div." + playerId);
             playerDiv.removeClass(playerId);
             playerDiv.addClass("available");
             popup.hide();
    });
    }else{    
    player.attr("data-money",playersMoney);
    player.attr("title",player.attr("id") + ": $" + playersMoney);
    Monopoly.playSound("chaching");
    }
    Monopoly.closePopup();
};
//Randomly generating dices numbers & resetting the counter to 0 for non-double dices
Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ;
    var result2 = Math.floor(Math.random() * 6) + 1 ;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    if (result1 == result2){
        Monopoly.doubleCounter++;
    }else{
        Monopoly.doubleCounter=0;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer,"move",result1 + result2);
};

//Makeing the player move 200ms after the dices have been rolled
Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
    var playerMovementInterval = setInterval(function(){
        if (steps == 0){
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        }else{
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    },200);
};

//Depending on which cell the player lands on, call the correct function
Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
    }else if(playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))){
         Monopoly.handlePayRent(player,playerCell);
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }else{
        Monopoly.setNextPlayerTurn();
    }
}

Monopoly.setNextPlayerTurn = function(){
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));
    if(Monopoly.doubleCounter == 0){
    var nextPlayerId = playerId + 1;
    } else if (currentPlayerTurn.is(".jailed")){
        var nextPlayerId = playerId + 1;
    }
    else {
        var nextPlayerId = playerId;
    }
    if (nextPlayerId > $(".player").length){
        nextPlayerId = 1;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")){
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time",currentJailTime);
        if (currentJailTime > 3){
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }else if(nextPlayer.is(".out")){
        Monopoly.setNextPlayerTurn();
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};

//If player lands on an available property make the buy popup appear
Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};
//If player lands on a property not available make the pay popup appear
Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);
        Monopoly.closeAndNextTurn();
    });
   Monopoly.showPopup("pay");
};

//If player reaches the go to jail cell make the jail popup appear
Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};

//If player reaches a chance cell make the chance popup appear
Monopoly.handleChanceCard = function(player){
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};
//If player reaches a community cell make the community popup appear
Monopoly.handleCommunityCard = function(player){
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(communityJson){
        popup.find(".popup-content #text-placeholder").text(communityJson["content"]);
        popup.find(".popup-title").text(communityJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",communityJson["action"]).attr("data-amount",communityJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
        });
    Monopoly.showPopup("community");
};

//Sending the player to jail
Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//Getting the popups to make them appear
Monopoly.getPopup = function(popupId){
    return $(".popup-lightbox .popup-page#" + popupId);
};
//Getting the price of a property if the player wants to buy it
Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};

//Getting the price a player will need to pay to another player if property is not available anymore
Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};

//Closing the popup and set next player turn
Monopoly.closeAndNextTurn = function(){
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};
//Checking that the number of players is between 1 to 4 before to start the game
Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

//Checking if the player has enough money, if yes buying the property and changing the availability of the cell
Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.showErrorMsg();
    }else{
        Monopoly.updatePlayersMoney(player,propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);
        Monopoly.setNextPlayerTurn();
    }
};




//Depending on the situation getting the right case to handle the next action
Monopoly.handleAction = function(player,action,amount){
    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
             break;
        case "pay":
            Monopoly.updatePlayersMoney(player,amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
        case "broke":
            Monopoly.setNextPlayerTurn();
            break;
    };
    Monopoly.closePopup();
};




//Creating the players on the grid depending on how many people are playing
Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
};


Monopoly.getNextCell = function(cell){
    var currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

//Adding money to the player each time he goes through the Go tole
Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player,-30);
};

//Checking that the number of players is between 1 and 4 at the beginning
Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 0 && value <= 4){
                isValid = true;
            }else{
                isValid=false;
            }
            break;
    }
    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;
}

Monopoly.showErrorMsg = function(){
    Monopoly.playSound("bouh");
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};

//Making the game responsive
Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}
//Closing all the popups
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};
//Playing sound for a specific action
Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav"); 
    snd.play();
}
//Showing popup when called
Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
    if(popupId === "broke"){
        $(".popup-darkbox .popup-page").hide();
        $(".popup-darkbox .popup-page#" + popupId).show();
        $(".popup-darkbox").fadeIn();
    }
};

Monopoly.init();