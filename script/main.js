

var game = []
var newGame = function(){
  return [0,0,0,0,0,0,0,0,0]
}

game = newGame()

var socket = io()
var player1ClickHandler = null
var player2ClickHandler = null
$('#player1').click(function(){
  if(player1ClickHandler){
      player1ClickHandler()
  }
})
$('#player2').click(function(){
  if(player2ClickHandler){
      player2ClickHandler()
  }
})
var gameStatus = {}
$('.felt').click(function(){
  if(gameStatus.turn == $('#user').val()){
    var id = $(this).attr('data-id')

    if(gameStatus.game[id] == 0){
      console.log('hey');
      socket.emit('pick',JSON.stringify({id:$('#user').val(),field:id}))
    }
  }
})

socket.on('status',function(data){
  gameStatus = JSON.parse(data)
  $('#status').html(gameStatus.status)
  if(gameStatus.player1 === -1){
    $('#player1').attr('src','/assets/join.png')
    $('#player1').attr('style','cursor:pointer')
    $('#player1name').html('')
    if($('#user').val() === ''){
      $('#player1').addClass('fb-login')
      player1ClickHandler = null
    }else {
      $('#player1').removeClass('fb-login')
      player1ClickHandler = function(){
        socket.emit('join',JSON.stringify({pos:1,id:$('#user').val()}))
      }
    }
  }else{
    player1ClickHandler = null
    $('#player1').attr('style','cursor:none')
    $('#player1').attr('src','/assets/'+gameStatus.player1+'.jpg')
    $('#player1name').html(gameStatus.player1name)
  }

  if(gameStatus.player2 === -1){
    $('#player2').attr('src','/assets/join.png')
    $('#player2').attr('style','cursor:pointer')
    $('#player2name').html('')
    if($('#user').val() === ''){
      $('#player2').addClass('fb-login')
      player2ClickHandler = null
    }else {
      $('#player2').removeClass('fb-login')
      player2ClickHandler = function(){
        socket.emit('join',JSON.stringify({pos:2,id:$('#user').val()}))
      }
    }
  }else{
    player2ClickHandler = null
    $('#player2').attr('style','cursor:none')
    $('#player2').attr('src','/assets/'+gameStatus.player2+'.jpg')
    $('#player2name').html(gameStatus.player2name)
  }

  $('.felt').each(function(){
    var id = $(this).attr('data-id')
    if(gameStatus.game[id] == gameStatus.player1){
        $(this).attr('src','/assets/x.png')
    }else if(gameStatus.game[id] == gameStatus.player2){
        $(this).attr('src','/assets/o.png')
    }else{
      $(this).attr('src','/assets/blank.png')
    }
  })

  $('#status').html(gameStatus.status)
})
