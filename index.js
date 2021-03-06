console.log("stuff");

var Umo = require('./umo.js');

var testumo = new Umo(50,50,21,"red");
testumo.update1();
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const playercolors = ["red","darkred","green","aqua","navy","blue","purple","deeppink","brown","darkgreen","indigo","lime","white"];
const xsize = 1024;
const ysize = 768;
const safex = 200; //size not location.
const safey = 200;
var maxspeed = 10;

class Sprite {
  constructor(xxx, yyy, sss, ccc) {
    this.x = xxx; //x
    this.y = yyy; //y
    this.s = sss; //size
    this.c = ccc ; //color
    this.vx = 0;//start with 0 velocity
    this.vy = 0;
  }
  draw(){
    context.fillStyle = this.c; //color specified
    context.fillRect(this.x-this.s/2, this.y-this.s/2, this.s, this.s);	
  }
  update1(){
    this.x = this.x + this.vx; //Increments position according to velocity.
    this.y = this.y + this.vy;
  }
  shove(dir, mag){//directions are 0 down 1 up 2 right 3 left
    if (dir==0){
      this.vy = this.vy + mag;
    }else if (dir==1){
      this.vy = this.vy - mag;
    }else if (dir==2){
      this.vx = this.vx + mag;
    }else if (dir==3){
      this.vx = this.vx - mag;
    }else {console.log("bad direction"+dir);}
  }
  collide(checkedsprite){  //Checks if this overlaps checkedsprite
    var dx = checkedsprite.x - this.x; //x position difference
    var dy = checkedsprite.y - this.y; //y position difference
    var meansize = (checkedsprite.s + this.s)/2;  //total size
    if (((dx < meansize) && (dx > -1*meansize )) && ((dy < meansize) && (dy > -1*meansize ))){
      return true; 
    } else {return false;}
  }
  match(that){
    this.x=that.x;
    this.y=that.y;
    this.vx=that.vx;
    this.vy=that.vy;
  }
  kill(){
    this.x=-100;  //Resets position (usually offscreen)
    this.y=-100;
    this.vx = 0;         //resets velocity
    this.vy = 0;
  }
  randomize(xmax, ymax, vmax){ //This function randomizes location and velocity.
    this.x = this.s/2+Math.random()*(xmax - this.s/2); //Size is taken into account so items are
    this.y = this.s/2+Math.random()*(ymax - this.s/2); //not spawned partly out of bounds.
    this.vx = 2*(Math.random()*(vmax) - vmax/2); //Negative numbers are negative direction.
    this.vy = 2*(Math.random()*(vmax) - vmax/2);
  }
  boundarybounce(xmax, ymax){ //Bounces off walls of rectangle from 0,0 to xmax, ymax
    if (this.x < this.s/2){// || (this.x > xmax-this.s/2)){
      this.vx = -1*this.vx; //X wall collision for sprite
      this.x = this.s/2;
      return true;
    }else if (this.x > xmax-this.s/2){
      this.vx = -1*this.vx; //X wall collision for sprite
      this.x = xmax - this.s/2;
      return true;
    }else if (this.y < this.s/2){// || (this.y > ymax-this.s/2)){
      this.vy = -1*this.vy;  //Y wall collision for sprite
      this.y = this.s/2;
      return true;
    }else if (this.y > ymax-this.s/2){
      this.vy = -1*this.vy;
      this.y = ymax - this.s/2;
      return true;
    } else {return false;}
  }
  boundarykill(xmax, ymax){ //Bounces off walls of rectangle from 0,0 to xmax, ymax
    if ((this.x < this.s/2) || (this.x > xmax-this.s/2)){
    this.kill();			//X wall collision for sprite
    return 1;
    }else if ((this.y < this.s/2) || (this.y > ymax-this.s/2)){
    this.kill();			//Y wall collision for sprite
    return 1;
    } else {return 0;}
  }
}
class Bouncetangle{
  constructor(x1,y1,sx,sy){
    this.minx = x1;
    this.miny = y1;
    this.sx = sx;//Math.abs(x1-x2);
    this.sy = sy;//Math.abs(y1-y2);
    this.c = "grey";
  }
  collide(it){
    if (it.x+it.s/2>this.minx && it.x-it.s/2<this.minx+this.sx && it.y+it.s/2>this.miny && it.y-it.s/2<this.miny+this.sy){
      return true;
    }else {return false;}
  }
  bounceold(it){ //it is a sprite
    if (this.collide(it)){
      if (it.x>this.minx && it.x<this.minx+this.sx){//sprite coords are centered
        it.vy=-1*it.vy;
      }
      if (it.y>this.miny && it.y<this.miny+this.sy){//sprite coords are centered
        it.vx=-1*it.vx;
      }
    }
  }
  bounce(it){ //it is a sprite
    if (this.collide(it)){
      var cx = this.minx+this.sx/2;
      var cy = this.miny+this.sy/2;
      var dx = cx-it.x;
      var dy = cy-it.y;
      var xoverlap = this.sx/2+it.s/2-Math.abs(dx); 
      var yoverlap = this.sy/2+it.s/2-Math.abs(dy); 
      if (xoverlap>yoverlap){
        it.vy = -1*it.vy;//reverse velocity
        if (dy>0){it.y = this.miny-it.s/2;}else{it.y=this.miny+this.sy+it.s/2;}//eject sprite outside block
      }else {
        it.vx = -1*it.vx;
        if (dx>0){it.x = this.minx-it.s/2;}else{it.x=this.minx+this.sx+it.s/2;}//ejection to prevent getting stuck inside
      }
    }
  }
}
class Attractor{
  constructor(x,y,size,mass){
    this.x = x;
    this.y = y;
    this.s = size;
    this.m = mass;
  }
  attract(thesprite){
    var dx = this.x - thesprite.x;
    var dy = this.y - thesprite.y;
    var distsq = dx*dx+dy*dy;
    var dir = -1*Math.atan2(dx,dy)+Math.PI/2;
    thesprite.vx = thesprite.vx + Math.cos(dir)*this.m/distsq;
    thesprite.vy = thesprite.vy + Math.sin(dir)*this.m/distsq;
  }
}
class User{
  constructor(name,id){
    this.name = name;
    this.id = id;
    this.s = new Sprite(-100,-100,32,"tan");//constructor(xxx, yyy, sss, ccc) {
    this.bs = new Sprite(-100,-100,20,"magenta");// this.s is player sprite, this.bs is bomb sprite
    //this.es = new Sprite(-100,-100,32,"orange");// this.es is the bomb explosion
    this.input = -1;
    this.score = 100;
  }
}
class Userlist{
  constructor(users){
    this.users = users;
  }
  getname(userid){
    var i=0;
    var username = "Not found";
    while (i<this.users.length){
      if (this.users[i].id == userid){
        username = this.users[i].name;
        i = this.users.length;
      }
      i++;
    }
    return username;
  }
  setname(newname,userid){//needs failsafe
    var i=0;
    var success = false;
    while (i<this.users.length){
      if (this.users[i].id == userid){
        this.users[i].name = newname;
        i = this.users.length;
        success = true;
      }
      i++;
    }
    return success;
  }
  getcolor(userid){
    var i=0;
    var usercolor = "tan";
    while (i<this.users.length){
      if (this.users[i].id == userid){
        usercolor = this.users[i].s.c;
        i = this.users.length;
      }
      i++;
    }
    return usercolor;
  }
  setcolor(newcolor,userid){//needs failsafe
    var i=0;
    while (i<this.users.length){
      if (this.users[i].id == userid){
        this.users[i].s.c = newcolor;
        i = this.users.length;
      }
      i++;
    }
  }
  setinput(newinput,userid){//needs failsafe
    var i=0;
    while (i<this.users.length){
      if (this.users[i].id == userid){
        this.users[i].input = newinput;
        i = this.users.length;
      }
      i++;
    }
  }
  getindex(userid){
    var i=0;
    var userindex = "-1";//Deliberate error to make problem visible on function failure
    while (i<this.users.length){
      if (this.users[i].id == userid){
        userindex = i;
        i = this.users.length;
      }
      i++;
    }
    return userindex;
  }
}
var allusers = new Userlist([]);
var bling = new Sprite(0,0,48,"grey")
bling.randomize(xsize, ysize, 3);//This function randomizes location and velocity.
var level1 = [new Bouncetangle(384,112,256,32), new Bouncetangle(384,592,256,32)];
var level2 = [new Bouncetangle(192,256,32,256), new Bouncetangle(800,256,32,256)];
var level3 = [new Bouncetangle(384,112,256,32), new Bouncetangle(384,592,256,32), new Bouncetangle(192,256,32,256), new Bouncetangle(800,256,32,256)]
var currentlevel = 0;//Not yet used
var bts = level2; //bts contains all the bouncetangles in use, 
var ats = []; //ats contains all the attractors in use
//[new Attractor(128,128,16,1024),new Attractor(1024-128,768-128,16,-1024)];
//var ats = [new Attractor(192,192,16,1000)];
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
server.listen(3000,'192.168.4.44');//server ip goes here--relocated
io.on('connection', (socket) => { //Player input
  socket.on('gameinput', (input) => {
    var theid = socket.id;
    allusers.setinput(input,theid);
  });
});
io.on('connection', (socket) => { //Fresh connection and disconnection
    var theid = socket.id;
    var newuser = new User("Cactus Fantastico",theid);//Setting name, not really used
    var randomplayercolor = playercolors[Math.floor(Math.random()*playercolors.length)];
    allusers.users.push(newuser);
    allusers.setcolor(randomplayercolor,theid);
    io.to(theid).emit('whoami', randomplayercolor);//tell client what color they are
    var btsupdate = [];//Array to tell client where the bouncetangles are
    var i = 0;
    while(i<bts.length){
      btsupdate.push([bts[i].minx, bts[i].miny, bts[i].sx, bts[i].sy, bts[i].c]);
      i++;
    }
    var atsupdate = [];//array to tell client where the attractors are
    var i=0;
    while (i<ats.length){
      atsupdate.push([ats[i].x,ats[i].y,ats[i].s]);
      i++;
    }
    io.to(theid).emit('levelbts', btsupdate);
    io.to(theid).emit('levelats', atsupdate);
    allusers.users[allusers.users.length-1].s.x = xsize/2+Math.floor(Math.random()*9)-4;
    allusers.users[allusers.users.length-1].s.y = ysize/2+Math.floor(Math.random()*9)-4;
    console.log(allusers);
    socket.on('disconnect', () => {
        allusers.users.splice(allusers.getindex(theid), 1);//remove defunct users here
     });
});
const FPS = 30;
setInterval(update, 1000 / FPS);    		// set up interval (game loop)
function update() { //game loop
  var updateplayerarray = [];
  var updatebombarray = [];
  var updatescorearray = [];
  var updateblingarray = [];
  var i=0;
  while(i<allusers.users.length){//For all players...
    if (allusers.users[i].s.x<0){//Resurrect dead players
      allusers.users[i].s.x = xsize/2;
      allusers.users[i].s.y = ysize/2;
    }
    if (allusers.users[i].s.vx>maxspeed){allusers.users[i].s.vx = maxspeed;}//speed limits
    if (allusers.users[i].s.vy>maxspeed){allusers.users[i].s.vy = maxspeed;}
    //bomb explosion stuff
    if(allusers.users[i].bs.c=="orange"){//If bomb is in explosion state
      if (allusers.users[i].bs.s==80){//If bomb is in stage 1 of explosion...
        allusers.users[i].bs.s=120;//make boom even bigger
      }else if(allusers.users[i].bs.s==120){
        allusers.users[i].bs.s=144;
      }else if(allusers.users[i].bs.s==144){
        allusers.users[i].bs.s=128;
      }else{//otherwise, (if the bomb is in stage 2)
        allusers.users[i].bs.s=20; //reset bomb size
        allusers.users[i].bs.c="magenta";//and color
        allusers.users[i].bs.x=-100;//hide out of bounds
        allusers.users[i].bs.y=-100;
        allusers.users[i].bs.vx=0;//and stop
        allusers.users[i].bs.vy=0;
      }
    }
    //handling player input (movement and bomb launch/detonation)
    if (allusers.users[i].input>=0 && allusers.users[i].input<4){//If player has pressed an arrow
      allusers.users[i].s.shove(allusers.users[i].input,2);//push the sprite
    }else if (allusers.users[i].input==4){//if the player hit spacebar
      if (allusers.users[i].bs.x<0){
        allusers.users[i].bs.match(allusers.users[i].s);
      }else {
        allusers.users[i].bs.s=80;//This enlarges (explodes) bomb
        allusers.users[i].bs.c="orange";
      }
    }else if (allusers.users[i].input==11){//level change
      //change bouncetangles
    }else if (allusers.users[i].input==12){
      //change attractors
    }else if (allusers.users[i].input==13){
      //change maxspeed
    }else if (allusers.users[i].input==13){
      //change maxspeed
    }
    //safe zone
    var safe = false;
    if (allusers.users[i].s.x<xsize/2+safex/2 && allusers.users[i].s.x>xsize/2-safex/2 &&
        allusers.users[i].s.y<ysize/2+safey/2 && allusers.users[i].s.y>ysize/2-safey/2){
         safe = true;
       }
    //bomb collision handling
    var j=0;
    while (j<allusers.users.length){//to all users (including self)
      if (allusers.users[i].s.collide(allusers.users[j].bs)&&!safe){//if bomb is touching player
          if (allusers.users[j].bs.c=="orange"&&allusers.users[j].bs.x>0){//if bomb is exploding and in-bounds
            allusers.users[i].s.x = xsize/2+Math.floor(Math.random()*9)-4;//reset position
            allusers.users[i].s.y = ysize/2+Math.floor(Math.random()*9)-4;
            allusers.users[i].s.vx = 0;//stop player movement
            allusers.users[i].s.vy = 0;
            allusers.users[i].score--;
            //do more stuff, maybe do a timeout
          }
        }
      j++
      }
    if (bling.collide(allusers.users[i].bs)&&!safe){//if bomb is touching player
      if (allusers.users[i].bs.c=="orange"&&allusers.users[i].bs.x>0){//if bomb is exploding and in-bounds
        bling.randomize(xsize, ysize, 3); //This function randomizes location and velocity.
        allusers.users[i].score=allusers.users[i].score+2;
        //do more stuff, maybe do a timeout
        } 
      } 
    //bouncing stuff
    allusers.users[i].input = -1;//reset input to null value (0 is down arrow)
    allusers.users[i].s.boundarybounce(xsize, ysize);//Bounces off walls of rectangle
    if (allusers.users[i].bs.x>0){//only boundarybounce bombs if in bounds--inactive bombs stored oob
      allusers.users[i].bs.boundarybounce(xsize, ysize);//Bounces off walls of rectangle
    }
    var j=0;
    while (j<bts.length){
      bts[j].bounce(allusers.users[i].s);
      bts[j].bounce(allusers.users[i].bs);
      if (i==0){bts[j].bounce(bling);} //i==0 forces this to only execute once per loop per j,
      j++;
    }
    //attractors
    var j=0;
    while(j<ats.length){
      ats[j].attract(allusers.users[i].s);//motion
      ats[j].attract(allusers.users[i].bs);//motion (bomb)
      if (allusers.users[i].s.collide(ats[j])){ //kill on collision
        allusers.users[i].s.kill();
        allusers.users[i].score--;
      }
      if (allusers.users[i].bs.collide(ats[j])){ //kill bomb on collision
        allusers.users[i].bs.kill();
      }
      j++;
    }
    allusers.users[i].s.update1(); //basic motion update
    allusers.users[i].bs.update1();
    updateplayerarray.push([allusers.users[i].s.x,allusers.users[i].s.y,allusers.users[i].s.vx,allusers.users[i].s.vy,allusers.users[i].s.c]);
    updatebombarray.push([allusers.users[i].bs.x,allusers.users[i].bs.y,allusers.users[i].bs.vx,allusers.users[i].bs.vy,allusers.users[i].bs.c,allusers.users[i].bs.s]);
    updatescorearray.push([allusers.users[i].score,allusers.users[i].s.c]);//score and color
    i++;
  }
  bling.boundarybounce(xsize,ysize);
  bling.update1();
  updateblingarray.push([bling.x,bling.y]);//score and color
  io.emit('gameupdate', [updateplayerarray,updatebombarray,updatescorearray,updateblingarray]);
}