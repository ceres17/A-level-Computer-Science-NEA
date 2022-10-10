// debug
console.log(mazeSeed);
const mazeScale = 128;
let pixelSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size'));

// mapping keys to movement directions
const directions = {
    up: "up",
    down: "down",
    left: "left",
    right: "right"
}

const directionKeys = {
    'w': directions.up,
    'a': directions.left,
    'd': directions.right,
    's': directions.down,
    'ArrowUp': directions.up,
    'ArrowLeft': directions.left,
    'ArrowRight': directions.right,
    'ArrowDown': directions.down
}

const inventoryKeys = {
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5
}

const commands = {
    'e': 'interact',
    'q': 'drop'
}

const colours = {

}


const toBinary = {'A': '000000', 'B': '000001', 'C': '000010', 'D': '000011', 'E': '000100', 'F': '000101',
                    'G': '000110', 'H': '000111',
                    'I': '001000', 'J': '001001', 'K': '001010', 'L': '001011', 'M': '001100', 'N': '001101',
                    'O': '001110', 'P': '001111',
                    'Q': '010000', 'R': '010001', 'S': '010010', 'T': '010011', 'U': '010100', 'V': '010101',
                    'W': '010110', 'X': '010111',
                    'Y': '011000', 'Z': '011001', 'a': '011010', 'b': '011011', 'c': '011100', 'd': '011101',
                    'e': '011110', 'f': '011111',
                    'g': '100000', 'h': '100001', 'i': '100010', 'j': '100011', 'k': '100100', 'l': '100101',
                    'm': '100110', 'n': '100111',
                    'o': '101000', 'p': '101001', 'q': '101010', 'r': '101011', 's': '101100', 't': '101101',
                    'u': '101110', 'v': '101111',
                    'w': '110000', 'x': '110001', 'y': '110010', 'z': '110011', '0': '110100', '1': '110101',
                    '2': '110110', '3': '110111',
                    '4': '111000', '5': '111001', '6': '111010', '7': '111011', '8': '111100', '9': '111101',
                    '-': '111110', '_': '111111'}

class ObjectGroup{
    constructor(objectType) {
        this.objectType = objectType;
        this.objectList = [];
    }

    get(index){
        return this.objectList[index];
    }

    push(object){
        if (object.type === this.objectType){
            this.objectList.push(object);
            return new ObjectGroupReference(this.objectType, this.objectList.length-1, this)
        }
    }
}

class ObjectGroupReference{
    constructor(objectType, index, objectGroup) {
        this.objectType = objectType;
        this.index = index;
        this.objectGroup = objectGroup;
    }

    getSelf(){
        return this.objectGroup.get(this.index);
    }
}


class Lock{
    constructor(key) {
        this.type = 'lock';
        this.status = 'locked';
        this.key = key;
        this.colour = key.colour;
    }
}

class Item{
    constructor(type) {
        this.type = type;
        this.entity = new ItemEntity(0, 0)
    }

    place(y, x){
        this.entity.move(y, x)
    }

    take(){
        this.entity.remove()
    }

    update(){
        this.entity.updatePosition()
    }
}

class Key extends Item{
    constructor(colour) {
        super('key');
        this.colour = colour;
        this.entity.self.id = 'key';
        this.entity.self.setAttribute("colour", this.colour)
    }
}

class Sword extends Item{
    constructor() {
        super('sword');
    }
}

class Torch extends Item{
    constructor() {
        super('torch');
    }
}

class NodeList{
    constructor() {
        this.dict = {};
        this.keys = [];
    }

    getKeyFromPos(position){
        return 'y' + String(position.y) + 'x' + String(position.x);
    }

    push(node){
        let position = node.position();
        this.dict[this.getKeyFromPos(position)] = node;
        this.keys.unshift(node.position());
    }

    pop(){
        if (this.keys){
            let position = this.keys.shift();
            let key = this.getKeyFromPos(position);
            delete this.dict[key];
            return position;
        } else {
            return undefined;
        }
    }

    delete(position){
        let key = this.getKeyFromPos(position);
        delete this.dict[key];
        this.keys = this.keys.filter(function(e) { return e !== key});
    }

    contains(position){
        let key = this.getKeyFromPos(position);
        return key in this.dict;
    }
}

class Node{
    constructor(y, x, walls) {
        this.type = 'node'
        this.x = x;
        this.y = y;
        this.top = walls.top;
        this.bottom = walls.bottom;
        this.left = walls.left;
        this.right = walls.right;
        this.walls = walls;
        this.contains = undefined;
    }

    wallString(){
        return this.walls.toString();
    }

    position(){
        return {y: this.y, x: this.x};
    }

}

class HorizontalEdge extends Node{
    constructor(y, x) {
        let walls = { top: 1, bottom: 1, left: 0, right: 0 };
        super(y, x, walls);
        this.type = 'edge';
    }
}

class VerticalEdge extends Node{
    constructor(y, x) {
        let walls = { top: 0, bottom: 0, left: 1, right: 1 };
        super(y, x, walls);
        this.type = 'edge';
    }
}

class Maze {

    constructor(seed) {
        this.seed = seed;
        this.usedEdges = {};

        let base64String = this.seed.replace(/=/g, '');
        console.log(base64String);
        let binaryString = '';
        for (let i = 0; i < base64String.length; i++){
            binaryString += toBinary[base64String[i]];
        }
        let padding = (this.seed.length - base64String.length)*8;
        this.height = parseInt(binaryString.slice(0,8), 2);
        this.width = parseInt(binaryString.slice(8,16), 2);
        binaryString = binaryString.slice(16, binaryString.length - padding);
        console.log(binaryString,this.height, this.width);

        this.adjacencyList = [];

        let enemyNumber = Math.floor(3**(((this.height*this.width)**(1/2))/5))
        let enemySpawnSpacing = Math.floor((this.height*this.width)/enemyNumber)
        console.log(enemySpawnSpacing, enemyNumber)

        // populating tree
        let index = 0;
        let deadEndCodes = ['0111', '1011', '1101', '1110'];
        let deadEndPositions = []
        let corridorCodes = ['1010', '0101']
        this.enemySpawnPositions = []
        for (let row = 1; row <= this.height; row++) {
            let rowList = [];
            for (let column = 1; column <= this.width; column++) {
                let bin = binaryString.slice(0,4);
                if (deadEndCodes.includes(bin)){
                    deadEndPositions.push({y:row, x:column})
                } else if (!corridorCodes.includes(bin) && (index%(enemySpawnSpacing-Math.floor(enemySpawnSpacing/2)) === 0)){
                    this.enemySpawnPositions.push({y:row, x:column})
                }
                let walls = {top: parseInt(bin[0]), bottom: parseInt(bin[1]), left: parseInt(bin[2]), right: parseInt(bin[3])};
                let node = new Node(row, column, walls);
                rowList.push(node);
                binaryString = binaryString.slice(4);
                index += 1;
            }
            this.adjacencyList.push(rowList);
        }
        let noDeadEnds = deadEndPositions.length;
        let currentKey = undefined;
        let even = 0
        if ((noDeadEnds-1)%2 === 1){
            even = 1;
        }
        let usedEnds = []
        for (let n = noDeadEnds-1; n >= noDeadEnds%2; n--) {
            let nodePosition = deadEndPositions[n];
            console.log(nodePosition)
            let x = ((nodePosition.x-1) * mazeScale )
            let y = ((nodePosition.y-1) * mazeScale )
            if (n % 2 === even) {
                currentKey = new Key('red')
                let keyReference = keyGroup.push(currentKey)
                console.log(y, x)
                currentKey.entity.spawn(y, x)
                this.adjacencyList[nodePosition.y - 1][nodePosition.x - 1].contains = keyReference;
                usedEnds.push([nodePosition.y, nodePosition.x])
            } else if (n % 2 !== even) {
                this.adjacencyList[nodePosition.y - 1][nodePosition.x - 1].contains = lockGroup.push(new Lock(currentKey));
                usedEnds.push([nodePosition.y, nodePosition.x])
            }
        }
        console.log(usedEnds)
    }


    checkTileInMaze(y, x){
        if ((1 > x || x > this.width) || (1 > y || y > this.height)){
            return false;
        } else if (x % 1 === 0 && y % 1 === 0){
            return true;
        } else if (y % 1 !== 0 && x % 1 === 0){
            let adjTile = this.adjacencyList[Math.floor(y) - 1][x - 1];
            if (adjTile.bottom === 0){
                return true;
            }
        } else if (x % 1 !== 0 && y % 1 === 0){
            let adjTile = this.adjacencyList[y - 1][Math.floor(x) - 1];
            if (adjTile.right === 0){
                return true;
            }
        }
        return false;
    }

    checkUsedEdge(tile){
        if (tile.type === 'edge'){
            if (tile.contains === undefined){
                delete this.usedEdges[{y: tile.y, x: tile.x}]
            } else {
                this.usedEdges[{y: tile.y, x: tile.x}] = tile
            }
        }
    }

    getNode(y, x){
        if (this.checkTileInMaze(y, x)) {
            if (x % 1 === 0 && y % 1 === 0){
                return this.adjacencyList[y - 1][x - 1];
            } else {
                let edgeUsed = this.usedEdges[{y : y, x: x}]
                if (edgeUsed !== undefined){
                    return edgeUsed
                } else {
                    if (x % 1 !== 0) {
                        return new HorizontalEdge(y, x);
                    } else if (y % 1 !== 0) {
                        return new VerticalEdge(y, x);
                    }
                }
            }
        }
        return false;
    }

    output(){
        console.log(this.adjacencyList);
    }

}

class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 0;
        this.prevTile = {y: 0, x:0};
        this.currentTile = {y: 0, x:0};
        this.tileOrigin = {y: 0, x:0}
        this.move_directions = [];
        this.map = document.querySelector('.map');
    }

    // function to round a number to the nearest 0.5
    roundTileCoord(tileCoord) {
        if (tileCoord - Math.floor(tileCoord) > 0.5) {
            tileCoord = Math.floor(tileCoord) + 0.5;
        } else {
            tileCoord = Math.floor(tileCoord);
        }
        return tileCoord;
    }

    determineCurrentTile(){
        // store previous node to know where its walls where
        this.prevTile.x = this.currentTile.x;
        this.prevTile.y = this.currentTile.y

        // work out which tile in the spanning tree the entity is in
        let x = this.roundTileCoord((this.x / mazeScale) + 1);
        let y = this.roundTileCoord((this.y / mazeScale) + 1);

        this.currentTile = maze.getNode(y, x);
        this.determineTileOrigin();
    }

    determineTileOrigin(){
        // get the coordinates of the tile and data from spanning tree
        this.tileOrigin.x = (this.currentTile.x - 1) * mazeScale;
        this.tileOrigin.y = (this.currentTile.y - 1) * mazeScale;
    }

    checkCollision(originalX, originalY) {
        // maze wall collisions
        // top, bottom, left, right

        this.determineCurrentTile();

        // left
        if (this.x < this.tileOrigin.x + 3) {
            if (this.currentTile.left === 1) {
                this.x = originalX;
            } else if (this.currentTile.left === 0 && (this.y > this.tileOrigin.y + 46 || this.y < this.tileOrigin.y + 5)) {
                // corner correction
                this.y = originalY;
            }
        }
        // right
        if (this.x > this.tileOrigin.x + 51) {
            if (this.currentTile.right === 1) {
                this.x = originalX;
            } else if (this.currentTile.right === 0 && (this.y > this.tileOrigin.y + 46 || this.y < this.tileOrigin.y + 5)) {
                this.y = originalY;
            }
        }
        // top
        if (this.y < this.tileOrigin.y + 5) {
            if (this.currentTile.top === 1) {
                this.y = originalY;
            } else if (this.currentTile.top === 0 && (this.x < this.tileOrigin.x + 3 || this.x > this.tileOrigin.x + 51)) {
                this.x = originalX;
            }
        }
        // bottom
        if (this.y > this.tileOrigin.y + 46) {
            if (this.currentTile.bottom === 1) {
                this.y = originalY;
            } else if (this.currentTile.bottom === 0 && (this.x < this.tileOrigin.x + 3 || this.x > this.tileOrigin.x + 51)) {
                this.x = originalX;
            }
        }
    }

    move() {
        if (this.move_directions.length > 0){

            
            // storing position from previous frame in case new position is blocked
            let originalX = this.x;
            let originalY = this.y;


            this.determineCurrentTile();

            for (let i = 0; i < this.move_directions.length; i++) {
                switch (this.move_directions[i]) {
                    case directions.right:
                        this.x += this.speed;
                        break;
                    case directions.left:
                        this.x -= this.speed;
                        break;
                    case directions.down:
                        this.y += this.speed;
                        break;
                    case directions.up:
                        this.y -= this.speed;
                        break;
                }
            }

            this.checkCollision(originalX, originalY);

            this.self.setAttribute("facing", this.move_directions[0]);
            this.self.setAttribute("walking", "true");

        } else {
            this.self.setAttribute("walking", "false");
        }
    }

    getCurrentTile(){
        return this.currentTile;
    }

}

class ItemEntity extends Entity{
    constructor() {
        super(20, 28);
        this.determineCurrentTile();
        this.self = document.createElement("div");
        this.self.className = "item"
    }

    determineCurrentTile(){
        // work out which tile in the spanning tree the entity is in
        let x = this.roundTileCoord((this.x / mazeScale) + 1);
        let y = this.roundTileCoord((this.y / mazeScale) + 1);

        this.determineTileOrigin(y, x)
    }

    determineTileOrigin(y, x){
        // get the coordinates of the tile and data from spanning tree
        this.tileOrigin.x = (x - 1) * mazeScale;
        this.tileOrigin.y = (y - 1) * mazeScale;
    }

    spawn(y, x){
        this.map.appendChild(this.self)
        this.move(y, x)
    }

    updatePosition(){
        this.self.style.transform = `translate3d( ${this.x * pixelSize}px, ${this.y * pixelSize}px, 0 )`;
    }

    move(y, x){
        this.x = x
        this.y = y
        this.determineCurrentTile()
        this.x = this.tileOrigin.x + 20;
        this.y = this.tileOrigin.y + 28;
        this.updatePosition()
        this.self.style.visibility = 'visible';
    }

    remove(){
        this.self.style.visibility = 'hidden';
    }
}

class Inventory {
    constructor(){
        this.size = 5;
        this.contents = [undefined, undefined, undefined, undefined, undefined];
    }

    setDocumentInventorySlot(slot, type){
        let slotView = document.getElementById(slot);
        if (type !== null){
            slotView.setAttribute('item', type);
        } else {
            slotView.removeAttribute('item');
        }

    }

    getItemFromSlot(slot){
        if (this.contents[slot] !== undefined){
            return this.contents[slot];
        } else {
            return false;
        }
    }

    insertItem(itemReference, activeSlot){
        let slot = '';
        for (let index = 0; index < this.size; index++){
            if (this.contents[index] === undefined){
                this.contents[index] = itemReference;
                slot = 'slot-' + index.toString();
                break;
            } else if (index === this.size-1){
                //this.contents[activeSlot].drop();
                this.contents[activeSlot] = itemReference;
                slot = 'slot-' + activeSlot.toString();
            }
        }
        this.setDocumentInventorySlot(slot, itemReference.objectType)
    }

    removeItem(activeSlot){
        let itemReference = this.contents[activeSlot];
        this.contents[activeSlot] = undefined;
        this.setDocumentInventorySlot('slot-' + activeSlot.toString(), null)
        return itemReference;
    }
}

class Player extends Entity {
    constructor() {
        super(27, 16);
        this.prevTile = {y:0, x:0}
        this.currentTile = maze.getNode(1, 1)
        this.speed = 1;
        this.inventory = new Inventory();
        this.self = document.querySelector('.character');
    }

    executeCommand(command){
        switch (command){
            case 'interact':
                this.interact();
                break;
            case 'drop':
                this.drop();
                break;
        }
    }

    interact(){
        if (this.currentTile.contains !== undefined){
            if (this.currentTile.contains.objectType === 'lock'){
                let lock = this.currentTile.contains.getSelf()
                let itemReference = this.inventory.getItemFromSlot(activeInventorySlot);
                if (itemReference.objectType === 'key'){
                    let key = itemReference.getSelf();
                    if (key.colour === lock.colour){
                        lock.status = 'unlocked';
                        this.inventory.removeItem(activeInventorySlot);
                        checkWinCondition();
                    }
                }
            } else {
                let itemReference = this.currentTile.contains;
                this.inventory.insertItem(itemReference, activeInventorySlot);
                this.currentTile.contains.getSelf().take()
                this.currentTile.contains = undefined;
                maze.checkUsedEdge(this.currentTile);
            }
        }
    }

    drop(){
        if (this.inventory.getItemFromSlot(activeInventorySlot) !== undefined && this.currentTile.contains === undefined){
            this.currentTile.contains = this.inventory.removeItem(activeInventorySlot);
            this.currentTile.contains.getSelf().place(this.y, this.x)
            maze.checkUsedEdge(this.currentTile)
        }
    }

    move(){
        let mapX = this.x;
        let mapY = this.y;

        //console.log(this.y, this.x, held_directions);

        this.move_directions = held_directions;
        super.move();

        // smooth camera movement - moves the map against the player while the player is in the centre of the map
        if (mapX < 112) { mapX = 112; } // left
        if (mapX > imgWidth - 112) { mapX = imgWidth - 112; } // right
        if (mapY < 112) { mapY = 112; } // tops
        if (mapY > imgHeight - 112) { mapY = imgHeight - 112; } // bottom
        let camera_top = pixelSize * 112;
        let camera_left = pixelSize * 112;

        // moving the map and player
        this.map.style.transform = `translate3d( ${-mapX * pixelSize + camera_left}px, ${-mapY * pixelSize + camera_top}px, 0 )`;
        this.self.style.transform = `translate3d( ${this.x * pixelSize}px, ${this.y * pixelSize}px, 0 )`;

        }
}

class Enemy extends Entity {
    constructor(range) {
        super(27, 16);
        this.speed = 7/8;
        this.range = range;
        this.path = [];
        this.target = {y: -1, x: -1};
        this.targetTile = {};
        this.self = document.createElement("div");
        this.self.className = "enemy"
    }

    spawn(tileY, tileX){
        this.x = (tileX -1) * mazeScale + 20;
        this.y = (tileY -1) * mazeScale + 40;
        this.currentTile = {y: tileY, x: tileX};
        this.map.appendChild(this.self)
        this.self.style.transform = `translate3d( ${this.x * pixelSize}px, ${this.y * pixelSize}px, 0 )`;
    }

    pathFind(){
        console.log(this.targetTile)
        let targetPosition = this.targetTile.position();
        if (this.path.length > 0 || (targetPosition.y === this.currentTile.y && targetPosition.x === this.currentTile.x)){
            return;
        }
        let min = {y: this.currentTile.y - this.range/2, x: this.currentTile.x - this.range/2};
        let max = {y: this.currentTile.y + this.range/2, x: this.currentTile.x + this.range/2};

        // enemy should only find a path if the target is within its range
        if (min.y <= this.targetTile.y && this.targetTile.y <= max.y && min.x <= this.targetTile.x && this.targetTile.x <= max.x){

            let nodesInRange = new NodeList();
            //console.log('search start', this.currentTile, this.targetTile.position());

            for (let row = min.y; row <= max.y; row += 0.5){
                for (let column = min.x; column <= max.x; column += 0.5){
                    let node = maze.getNode(row, column);
                    if (node){
                        nodesInRange.push(node);
                    }
                }
            }
            // recursive backtracking starts at target for better efficiency
            // * explain in design
            let checkTile = this.targetTile;
            let checkPosition = checkTile.position();
            let visitedNodes = new NodeList();

            while(true){
                if (checkPosition.y === this.currentTile.y && checkPosition.x === this.currentTile.x){
                    // has found player
                    console.log('player found', this.path)
                    break;
                }

                // ensures a node is not checked twice
                nodesInRange.delete(checkPosition);
                let nextPosition = checkPosition;
                let direction = "";

                // if the player is in an adjacent tile, the correct direction is known
                if (nextPosition.x === this.currentTile.x && nextPosition.y + 0.5 === this.currentTile.y){
                    nextPosition.y += 0.5;
                    direction = "up";

                } else if (nextPosition.x === this.currentTile.x && nextPosition.y - 0.5 === this.currentTile.y){
                    nextPosition.y -= 0.5;
                    direction = "down";

                } else if (nextPosition.y === this.currentTile.y && nextPosition.x - 0.5 === this.currentTile.x){
                    nextPosition.x -= 0.5;
                    direction = "right";

                } else if (nextPosition.y === this.currentTile.y && nextPosition.x + 0.5 === this.currentTile.x){
                    nextPosition.x += 0.5;
                    direction = "left";

                // when the player is not in an adjacent tile, tiles are checked using recursive backtracking
                } else if (checkTile.top === 0 && nodesInRange.contains({y: nextPosition.y - 0.5, x: nextPosition.x})){
                    nextPosition.y -= 0.5;
                    direction = "down";

                } else if (checkTile.bottom === 0 && nodesInRange.contains({y: nextPosition.y + 0.5, x: nextPosition.x})){
                    nextPosition.y += 0.5;
                    direction = "up";

                } else if (checkTile.left === 0 && nodesInRange.contains({y: nextPosition.y, x: nextPosition.x - 0.5})){
                    nextPosition.x -= 0.5;
                    direction = "right";

                } else if (checkTile.right === 0 && nodesInRange.contains({y: nextPosition.y, x: nextPosition.x + 0.5})){
                    nextPosition.x += 0.5;
                    direction = "left";

                } else {
                    // can't find player
                    if (this.path.length !== 0) {
                        this.path.shift();
                        checkPosition = visitedNodes.pop();
                    } else {
                        break;
                    }
                }
                if (nodesInRange.contains(nextPosition)){
                    this.path.unshift(direction);
                    visitedNodes.push(checkTile);
                    checkPosition = nextPosition;
                    checkTile = nodesInRange.dict[nodesInRange.getKeyFromPos(checkPosition)];
                }
            }
        }
    }



    move(){
        this.determineTileOrigin();
        this.targetTile = player.getCurrentTile();

        if (this.targetTile.x === this.currentTile.x && this.targetTile.y === this.currentTile.y) {
            // set player as target
            console.log('2', this.targetTile.x, this.targetTile.y, this.currentTile.x, this.currentTile.y);
            this.target.x = player.x;
            this.target.y = player.y;
        } else {
            this.pathFind();
        }

        //console.log(this.y, this.x, this.currentTile.x, this.currentTile.y, this.tileOrigin, this.target, this.path)
        if (this.target.x !== -1 && this.target.y !== -1) {
            console.log('1', this.target, this.y, this.x);
            // move towards target
            this.move_directions = [];
            if (this.x - 2 > this.target.x) {
                this.move_directions.push(directions.left);
            } else if (this.x + 2 < this.target.x) {
                this.move_directions.push(directions.right);
            }
            if (this.y - 2 > this.target.y) {
                this.move_directions.push(directions.up);
            } else if (this.y + 2 < this.target.y) {
                this.move_directions.push(directions.down);
            }
            if (this.move_directions.length > 0) {
                super.move();
            } else {
                //console.log(this.target, this.path)
                this.target.x = this.target.y = -1;
                this.path.shift();
            }
        }
        if (this.path.length > 0 && this.target.x === -1 && this.target.y === -1){
            console.log('3', this.path);
            // move to next tile
            this.move_directions = [];
            this.move_directions.push(this.path[0]);
            super.move();
            //console.log(this.currentTile, this.prevTile)
            if (this.currentTile.x !== this.prevTile.x || this.currentTile.y !== this.prevTile.y) {
                this.target = {y: this.tileOrigin.y + 25, x: this.tileOrigin.x + 25};
                //console.log(this.tileOrigin, this.target)
            }
        }
        this.self.style.transform = `translate3d( ${this.x * pixelSize}px, ${this.y * pixelSize}px, 0 )`;
    }
}



let keyGroup = new ObjectGroup('key');
let lockGroup = new ObjectGroup('lock');
let enemyGroup = new ObjectGroup('enemy');


const checkWinCondition = function(){
    for (const lock of lockGroup.objectList){
        if (lock.status === 'locked'){
            return false;
        }
    }
    console.log('you win!')
    return true;
}

const maze = new Maze(mazeSeed);
maze.output();

let player = new Player();

console.log(maze.enemySpawnPositions)
for (const coord of maze.enemySpawnPositions){
    let enemy = new Enemy(3)
    enemyGroup.objectList.push(enemy);
    enemy.spawn(coord.y,  coord.x)
}


// setting css properties to correct values
let root = document.querySelector(':root');
root.style.setProperty('--map-width', maze.width);
root.style.setProperty('--map-height', maze.height);

// initial variable declarations
let held_directions = [];
const imgWidth = (maze.width * mazeScale) - 64;
const imgHeight = (maze.height * mazeScale) - 64;
let activeInventorySlot = 0;

// determines where the character (and maze) is positioned every frame
const gameLoop = function () {

    // need to get pixel size every frame as it varies depending on how large the browser window is
    pixelSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size'));

    player.move();
    for (const enemy of enemyGroup.objectList){
        enemy.move()
    }

    for (const item of keyGroup.objectList){
        item.update()
    }

}

// steps through every frame
const step = function () {
    gameLoop();
    window.requestAnimationFrame(function () {
        step();
    })
}
step();


// event listeners for keys being pressed and released
document.addEventListener('keydown', function (e) {
    let direction = directionKeys[e.key];
    let inventorySlot = inventoryKeys[e.key];
    let command = commands[e.key];
    // adds last key pressed to the start of the held_directions array
    if (direction && held_directions.indexOf(direction) === -1) {
        held_directions.unshift(direction);
    } else if (inventorySlot) {
        activeInventorySlot = inventorySlot-1;
    } else if (command){
        player.executeCommand(command)
    }
})

document.addEventListener('keyup', function (e) {
    let direction = directionKeys[e.key];
    let index = held_directions.indexOf(direction);
    // removes key from help_directions when it stops being pressed
    if (index > -1) {
        held_directions.splice(index, 1);
    }
})