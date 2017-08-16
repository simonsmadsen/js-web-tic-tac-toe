const web = require('js-web')
const db = web.storage.mysql

/**
 * Tables!
*/
const users = db.table('users')

/**
 * Injections
*/
const injections = [
  web.inject.jquery(),
  web.inject.bootstrap(),
  web.inject.style('style/main.sass'),
  web.inject.socketIO(),
  web.inject.script('script/main.js'),
  web.inject.facebookAuth('/facebook-login','fb-login')
]

/**
 * Routes
*/
web.htmlRoute('/','html/index.html', async (input,session,cookie) => {
  const user_id = session.get('user_id')
    return {
      user_id: user_id,
      user: user_id ? await users.find({id:user_id}) : null,
      users: await users.select(null,'point desc')
    }
},injections)

web.postRoute('/facebook-login', async (input,session) => {
  const foundUser = await users.find({facebook:input.userID})
  if(!foundUser){
    const userInfo = await
      web.social.getFacebookFields(input.accessToken)

    const user_id = await users.create({
      facebook:input.userID,
      name:userInfo.name
    })

    await web.social.getFacebookImage(input.accessToken,'assets/'+user_id+'.jpg')
    session.set('user_id',user_id)
  }else{
    session.set('user_id',foundUser.id)
  }

  return web.back()
})

/**
 * Socket
*/
let gameStatus = {
  player1: -1,
  player2: -1,
  player1name: '',
  player2name: '',
  player1socket: '',
  player2socket: '',
  game: [0,0,0,0,0,0,0,0,0],
  status: 'Waiting for players',
  turn: -1
}

const gameMessage = (msg,socket) => {
  for (let i = 1; i < 4; i++) {
    setTimeout( _ => {
      gameStatus.status = msg+' ('+(4-i)+')'
      socket.emit('status',JSON.stringify(gameStatus))
      socket.broadcast.emit('status',JSON.stringify(gameStatus))
    },i * 1000)
  }
  reset(socket)
}

const clearPlayer1 = _ => {
  gameStatus.player1 = -1
  gameStatus.player1name = ''
  gameStatus.player1socket = ''
}

const clearPlayer2 = _ => {
  gameStatus.player2 = -1
  gameStatus.player2name = ''
  gameStatus.player2socket = ''
}

const reset = (socket) => {
  setTimeout( _ => {
    gameStatus = {
      player1: -1,
      player2: -1,
      player1name: '',
      player2name: '',
      player1socket: '',
      player2socket: '',
      game: [0,0,0,0,0,0,0,0,0],
      status: 'Waiting for players',
      turn: -1
    }
    socket.emit('status',JSON.stringify(gameStatus))
    socket.broadcast.emit('status',JSON.stringify(gameStatus))
  },4000)
}

const magicCube = [4,9,2,3,5,7,8,1,6]
web.onSocketConnection( async (socket) => {
  socket.emit('status',JSON.stringify(gameStatus))
})
web.onSocketDisconnect( async (socket) => {
  if(socket.id == gameStatus.player1socket && gameStatus.status !== 'Waiting for players' ||
    socket.id == gameStatus.player2socket && gameStatus.status !== 'Waiting for players'){
      gameMessage('Missing player',socket)
    }

    if(socket.id == gameStatus.player1socket){
      clearPlayer1()
    }
    if(socket.id == gameStatus.player2socket){
      clearPlayer2()
    }
    socket.broadcast.emit('status',JSON.stringify(gameStatus))

})

const calcMagicNo = numbers => {
  if(numbers.length < 4){
    return numbers.reduce( (total,num) => total + num, 0 )
  }
  for (let i = 0; i < numbers.length; i++) {
    let no = numbers[i]
    for (let j = 0; j < numbers.length; j++) {
      if(i !== j){
        let partner = numbers[j]
        for (let k = 0; k < numbers.length; k++) {
          if(i !== k && j !== k){
            let adder = numbers[k]
            if(adder + partner + no == 15){
              return 15
            }
          }
        }
      }
    }
  }
  return 0
}
web.socket('pick', async (data,socket) => {
  const info = JSON.parse(data)
  gameStatus.game[info.field] = info.id

  gameStatus.status = gameStatus.turn == gameStatus.player1
    ? gameStatus.player2name : gameStatus.player1name
  gameStatus.status = gameStatus.status + ' turn'

  gameStatus.turn = gameStatus.turn == gameStatus.player1
    ? gameStatus.player2 : gameStatus.player1

  let magicNumbersp1 = []
  let magicNumbersp2 = []
  for (let i = 0; i < gameStatus.game.length; i++) {
    if (gameStatus.game[i] == gameStatus.player1){
      magicNumbersp1.push(magicCube[i])
    }
    if (gameStatus.game[i] == gameStatus.player2){
      magicNumbersp2.push(magicCube[i])
    }
  }

  let magicNumberp1 = calcMagicNo(magicNumbersp1)
  let magicNumberp2 = calcMagicNo(magicNumbersp2)

  if(magicNumberp1 == 15){
    const user = await users.find({id: gameStatus.player1})
    users.update({point: user.point + 1},{id: user.id})
    gameMessage(gameStatus.player1name+ ' Won!',socket)
    gameStatus.status = gameStatus.player1name+ ' Won!'
  }else if(magicNumberp2 == 15){
    const user = await users.find({id: gameStatus.player2})
    users.update({point: user.point + 1},{id: user.id})
    gameMessage(gameStatus.player2name+ ' Won!',socket)
    gameStatus.status = gameStatus.player2name+ ' Won!'
  }else if(gameStatus.game.filter(f => f == 0).length == 0){
    gameStatus.status = 'Draw! (3)'
    gameMessage('Draw!',socket)
  }

  socket.emit('status',JSON.stringify(gameStatus))
  socket.broadcast.emit('status',JSON.stringify(gameStatus))
})

web.socket('join', async (data,socket) => {
  const info = JSON.parse(data)
  const user = await users.find({id:info.id})

  if(info.pos == 1){
    if(gameStatus.player2 == info.id){
      clearPlayer2()
    }
    gameStatus.player1 = info.id
    gameStatus.player1name = user.name
    gameStatus.player1socket = socket.id
  }else{
    if(gameStatus.player1 == info.id){
      clearPlayer1()
    }
    gameStatus.player2 = info.id
    gameStatus.player2name = user.name
    gameStatus.player2socket = socket.id
  }

  if(gameStatus.player2 !== -1 && gameStatus.player1 !== -1){
    gameStatus.turn = gameStatus.player1
    gameStatus.status = gameStatus.player1name
    gameStatus.status = gameStatus.status + ' turn'
  }

  socket.emit('status',JSON.stringify(gameStatus))
  socket.broadcast.emit('status',JSON.stringify(gameStatus))
})

web.start()
