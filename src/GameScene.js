/**
 * Created by LuoXiang on 2016/3/10.
 */

var GameScene = cc.Scene.extend({
    //当前操作的目标
    m_target : null,
    m_mapLayer : null,
    m_blockSLayer : null,
    m_statusLayer : null,
    m_isBeginListen : false,
    m_isTouchEnd : false,
    m_isMoved : false,
    m_isGameOver : false,
    m_mapBlockLineI : undefined,
    m_mapBlockRowI : undefined,
    m_blockTouchListener : null,

    m_score : 0,
    m_cleanScore : 0,
    m_cleanCount : 0,
    m_putDownScore : 0,
    m_putDownCount : 0,
    onEnter : function(){
        this._super();

        this.m_mapLayer = new MapLayer();
        this.m_blockSLayer = new BlockShapeLayer();
        this.m_statusLayer = new StatusLayer();
        this.addChild(this.m_mapLayer);
        this.addChild(this.m_blockSLayer);
        this.addChild(this.m_statusLayer);
        var self = this;
        this.m_blockTouchListener = cc.EventListener.create({
            event : cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches : true,
            m_oldSpace : null,
            onTouchBegan : function(touch, event){
                var pos = touch.getLocation();
                var target = event.getCurrentTarget();
                self.m_target = target;
                if(cc.rectContainsPoint(target.getBoundingBox(), pos)){
                    self.m_isBeginListen = true;
                    if(undefined == this.m_oldSpace){
                        this.m_oldSpace = target.m_space;
                    }
                    target.m_space += 3;
                    //以当前间隙重新设置坐标
                    target.setBlockPos();
                    var scaleA = cc.scaleTo(0, 0.9, 0.9);
                    target.runAction(scaleA);
                    return true;
                }
                return false;
            },

            onTouchMoved : function(touch, event){
                var target = event.getCurrentTarget();
                self.m_isMoved = true;
                //获取当前两个触摸点在屏幕坐标系下的差值。
                var delta = touch.getDelta();
                target.x += delta.x;
                target.y += delta.y;
            },

            onTouchEnded : function(touch, event){
                var target = event.getCurrentTarget();
                self.m_isTouchEnd = true;

                var moveBackA = cc.moveTo(0.3, target.m_oldX, target.m_oldY);
                var actions = cc.spawn(moveBackA, target.getParent().m_action.clone());
                actions.setTag(1);
                //在一个动作上一次执行还没有完成又执行这个动作是会有问题的，动作之间会互相干扰。
                target.stopActionByTag(1);
                target.runAction(actions);
                //以原始间隙重新设置坐标
                target.m_space = this.m_oldSpace;
                target.setBlockPos();
            }
        });

        cc.eventManager.addListener(this.m_blockTouchListener.clone(), this.m_blockSLayer.m_currentBS[0]);
        cc.eventManager.addListener(this.m_blockTouchListener.clone(), this.m_blockSLayer.m_currentBS[1]);
        cc.eventManager.addListener(this.m_blockTouchListener.clone(), this.m_blockSLayer.m_currentBS[2]);
        cc.eventManager.addListener(this.m_blockTouchListener.clone(), this.m_blockSLayer.m_currentBS[3]);

        //this.schedule(this.update, 1, cc.REPEAT_FOREVER, 1);
        this.scheduleUpdate();
    },

    //判断当前位置是否能够放下，
    putDown : function(target){
        var mapBs = this.m_mapLayer.m_blocks;
        var targetBs = target.m_blocks;
        var mapV = this.m_mapLayer.m_map.m_mapA;
        var pos = this.convertToWorldPos(targetBs[0].getPosition(), target);

        for(var i = 0; i < mapBs.length; ++i){
            // 计算每一行的元素的个数
            var lineLength = gMapLineM - Math.abs(4 - i);
            var j = 0;
            if(i > 4){
                j = i - 4;
            }
            var rowMax = j + lineLength;
            for(j; j < rowMax; ++j){
                if(cc.rectContainsPoint(mapBs[i][j].getBoundingBox(), pos)) {
                    var blockLineI1 = i;
                    var blockRowI1 = j;
                    var blockLineI2 = blockLineI1 + targetBs[1].m_lineI;
                    var blockRowI2 = blockRowI1 + targetBs[1].m_rowI;
                    var blockLineI3 = blockLineI1 + targetBs[2].m_lineI;
                    var blockRowI3 = blockRowI1 + targetBs[2].m_rowI;
                    var blockLineI4 = blockLineI1 + targetBs[3].m_lineI;
                    var blockRowI4 = blockRowI1 + targetBs[3].m_rowI;

                    var bConditoion =
                        blockLineI2 >= 0 && blockLineI2 < rowMax &&
                        blockLineI3 >= 0 && blockLineI3 < rowMax &&
                        blockLineI4 >= 0 && blockLineI4 < rowMax &&
                        mapV[blockLineI1][blockRowI1] == gMapTag.empty &&
                        mapV[blockLineI2][blockRowI2] == gMapTag.empty &&
                        mapV[blockLineI3][blockRowI3] == gMapTag.empty &&
                        mapV[blockLineI4][blockRowI4] == gMapTag.empty;
                    if(bConditoion){
                        //如果之前已经填充，然后现在又满足条件，可以填充了，应为putDown函数在
                        //cleanPutDown函数前，这里会把前次记录的i,j覆盖，导致之前的临时填充的方块失去监控
                        if(this.m_mapBlockLineI != undefined && this.m_mapBlockRowI != undefined){
                            //this.cleanPutDown(this.m_target);
                            this.directCleanPutDown(target);
                        }
                        mapBs[blockLineI1][blockRowI1].setSpriteColor(target.m_color);
                        mapBs[blockLineI2][blockRowI2].setSpriteColor(target.m_color);
                        mapBs[blockLineI3][blockRowI3].setSpriteColor(target.m_color);
                        mapBs[blockLineI4][blockRowI4].setSpriteColor(target.m_color);
                        mapV[blockLineI1][blockRowI1] = gMapTag.fill;
                        mapV[blockLineI2][blockRowI2] = gMapTag.fill;
                        mapV[blockLineI3][blockRowI3] = gMapTag.fill;
                        mapV[blockLineI4][blockRowI4] = gMapTag.fill;
                        this.m_mapBlockLineI = i;
                        this.m_mapBlockRowI = j;
                    }
                    return;
                }
            }
        }
    },

    //判断地图中是否还有位置能够放下
    canPutDown : function(){
        var mapBs = this.m_mapLayer.m_blocks;
        var mapV = this.m_mapLayer.m_map.m_mapA;

        //最后一个方块为缓冲方块，其并不可见，不需判断
        for(var k = 0; k < this.m_blockSLayer.m_currentBS.length - 1; ++k){
            var targetBs = this.m_blockSLayer.m_currentBS[k].m_blocks;
            for(var i = 0; i < mapBs.length; ++i){
                // 计算每一行的元素的个数
                var lineLength = gMapLineM - Math.abs(4 - i);
                var j = 0;
                if(i > 4){
                    j = i - 4;
                }
                var rowMax = j + lineLength;
                for(j; j < rowMax; ++j){
                    if(gMapTag.empty == mapV[i][j]) {
                        var blockLineI1 = i;
                        var blockRowI1 = j;
                        var blockLineI2 = blockLineI1 + targetBs[1].m_lineI;
                        var blockRowI2 = blockRowI1 + targetBs[1].m_rowI;
                        var blockLineI3 = blockLineI1 + targetBs[2].m_lineI;
                        var blockRowI3 = blockRowI1 + targetBs[2].m_rowI;
                        var blockLineI4 = blockLineI1 + targetBs[3].m_lineI;
                        var blockRowI4 = blockRowI1 + targetBs[3].m_rowI;

                        var bConditoion =
                            blockLineI2 >= 0 && blockLineI2 < rowMax &&
                            blockLineI3 >= 0 && blockLineI3 < rowMax &&
                            blockLineI4 >= 0 && blockLineI4 < rowMax &&
                            mapV[blockLineI2][blockRowI2] == gMapTag.empty &&
                            mapV[blockLineI3][blockRowI3] == gMapTag.empty &&
                            mapV[blockLineI4][blockRowI4] == gMapTag.empty;
                        if(bConditoion){
                            return true;
                        }
                    }
                }
            }
            cc.log("k is: " + k);
        }
        this.m_isGameOver = true;
        return false;
    },

    /*
    * 清除放下的方块，在没有TouchEnded之前
    * */
    cleanPutDown : function(target){
        if(this.m_mapBlockLineI == undefined || this.m_mapBlockRowI == undefined){
            return;
        }
        var mapBs = this.m_mapLayer.m_blocks;
        var targetBs = target.m_blocks;
        var mapV = this.m_mapLayer.m_map.m_mapA;
        var pos = this.convertToWorldPos(targetBs[0].getPosition(), target);

        if(cc.rectContainsPoint(mapBs[this.m_mapBlockLineI][this.m_mapBlockRowI].getBoundingBox(), pos)){
            return;
        }else{
            var blockLineI1 = this.m_mapBlockLineI;
            var blockRowI1 = this.m_mapBlockRowI;
            var blockLineI2 = blockLineI1 + targetBs[1].m_lineI;
            var blockRowI2 = blockRowI1 + targetBs[1].m_rowI;
            var blockLineI3 = blockLineI1 + targetBs[2].m_lineI;
            var blockRowI3 = blockRowI1 + targetBs[2].m_rowI;
            var blockLineI4 = blockLineI1 + targetBs[3].m_lineI;
            var blockRowI4 = blockRowI1 + targetBs[3].m_rowI;
            mapBs[blockLineI1][blockRowI1].setSpriteColor(this.m_mapLayer.m_mapColor);
            mapBs[blockLineI2][blockRowI2].setSpriteColor(this.m_mapLayer.m_mapColor);
            mapBs[blockLineI3][blockRowI3].setSpriteColor(this.m_mapLayer.m_mapColor);
            mapBs[blockLineI4][blockRowI4].setSpriteColor(this.m_mapLayer.m_mapColor);
            mapV[blockLineI1][blockRowI1] = gMapTag.empty;
            mapV[blockLineI2][blockRowI2] = gMapTag.empty;
            mapV[blockLineI3][blockRowI3] = gMapTag.empty;
            mapV[blockLineI4][blockRowI4] = gMapTag.empty;
            this.m_mapBlockLineI = undefined;
            this.m_mapBlockRowI = undefined;
        }
    },

    /*
    * 直接清除放下的方块，不进行条件判断，请不要调用此方法
    * */
    directCleanPutDown : function(target){
        var mapBs = this.m_mapLayer.m_blocks;
        var targetBs = target.m_blocks;
        var mapV = this.m_mapLayer.m_map.m_mapA;
        var pos = this.convertToWorldPos(targetBs[0].getPosition(), target);
        var blockLineI1 = this.m_mapBlockLineI;
        var blockRowI1 = this.m_mapBlockRowI;
        var blockLineI2 = blockLineI1 + targetBs[1].m_lineI;
        var blockRowI2 = blockRowI1 + targetBs[1].m_rowI;
        var blockLineI3 = blockLineI1 + targetBs[2].m_lineI;
        var blockRowI3 = blockRowI1 + targetBs[2].m_rowI;
        var blockLineI4 = blockLineI1 + targetBs[3].m_lineI;
        var blockRowI4 = blockRowI1 + targetBs[3].m_rowI;
        mapBs[blockLineI1][blockRowI1].setSpriteColor(this.m_mapLayer.m_mapColor);
        mapBs[blockLineI2][blockRowI2].setSpriteColor(this.m_mapLayer.m_mapColor);
        mapBs[blockLineI3][blockRowI3].setSpriteColor(this.m_mapLayer.m_mapColor);
        mapBs[blockLineI4][blockRowI4].setSpriteColor(this.m_mapLayer.m_mapColor);
        mapV[blockLineI1][blockRowI1] = gMapTag.empty;
        mapV[blockLineI2][blockRowI2] = gMapTag.empty;
        mapV[blockLineI3][blockRowI3] = gMapTag.empty;
        mapV[blockLineI4][blockRowI4] = gMapTag.empty;
        this.m_mapBlockLineI = undefined;
        this.m_mapBlockRowI = undefined;
    },

    removeBlockShape : function(target){
        if(this.m_isTouchEnd){
            //如果已经填充了，并且放开鼠标，确定填充
            if(this.m_mapBlockLineI != undefined && this.m_mapBlockRowI != undefined){
                //找出target位于保存其容器中的位置
                var targetI = 0;
                for(var i = 0; i < this.m_blockSLayer.m_currentBS.length; ++i)
                {
                    if(target == this.m_blockSLayer.m_currentBS[i]){
                        targetI = i;
                        break;
                    }
                }
                //取得它的初始坐标
                var originalX = target.m_oldX;
                var originalY = target.m_oldY;

                target.stopAllActions();
                target.removeFromParent();
                //更改方块位置
                for(var i = this.m_blockSLayer.m_currentBS.length - 1; i > targetI; --i){
                    if(targetI + 1 == i){
                        this.m_blockSLayer.m_currentBS[i].setOriginalPos(cc.p(originalX, originalY));
                    }
                    else{
                        this.m_blockSLayer.m_currentBS[i].setOriginalPos(this.m_blockSLayer.m_currentBS[i - 1].getPosition());
                    }
                }
                //更改方块位于存储方块容器中的索引，方块数组存储的为对应方块的地址
                //如果给另一个变量赋此值得话，它们指向的为同一个对象
                for(var i = targetI; i < this.m_blockSLayer.m_currentBS.length - 1; ++i){
                    this.m_blockSLayer.m_currentBS[i] = this.m_blockSLayer.m_currentBS[i + 1];
                }
                //将新方块加入BlockSLayer中
                this.m_blockSLayer.addChild(this.m_blockSLayer.m_currentBS[2]);
                //生成缓冲方块
                var cIndex = Math.floor(cc.rand() % 7);
                var bIndex = Math.floor(cc.rand() % 21) + 1;
                this.m_blockSLayer.m_currentBS[3] = new ShapeType(bIndex, this.m_blockSLayer.m_colors[cIndex]);
                this.m_blockSLayer.m_currentBS[3].runAction(this.m_blockSLayer.m_action.clone());
                cc.eventManager.addListener(this.m_blockTouchListener.clone(), this.m_blockSLayer.m_currentBS[3]);

                cc.log("put down ok");
                //更新放下方块数
                ++this.m_putDownCount;
                //记录得分
                this.m_putDownScore = gScoreBase;
                //在放下方块后才需要进行消行判断
                this.dealWithFullLine();
                //更新分数
                this.addScore();
                //放下方块后，并且地图清理后，要判断当前地图是否还能放下方块
                this.canPutDown();
            }
            this.m_mapBlockLineI = undefined;
            this.m_mapBlockRowI = undefined;
            this.m_isMoved = false;
            this.m_isBeginListen = false;
            this.m_isTouchEnd = false;
        }
    },

    /*
    * 世界坐标的转换,pos需要转换的坐标，parrent父亲节点
    * */
    convertToWorldPos : function(pos, parrent){
        var resultPos = new cc.Point(0, 0);
        var parrentPos = parrent.getPosition();
        var anchor = parrent.getAnchorPoint();
        var size = parrent.getContentSize();
        resultPos.x = parrentPos.x - (anchor.x * size.width) + pos.x;
        resultPos.y = parrentPos.y - (anchor.y * size.height)+ pos.y;
        return resultPos;
    },

    update : function(){
       if(this.m_isBeginListen ){
           var target = this.m_target;
           this.putDown(target);
           this.cleanPutDown(target);
           this.removeBlockShape(target);
           this.gameOver();
       }
    },

    //满行处理
    dealWithFullLine : function(){
        var cleanLineP = new Array(9);
        for(var i = 0; i < cleanLineP.length; ++i){
            cleanLineP[i] = new FullFlagPoint();
        }
        cleanLineP[0].setLRIndexAndLength(0, 0, 5);
        cleanLineP[1].setLRIndexAndLength(1, 0, 6);
        cleanLineP[2].setLRIndexAndLength(2, 0, 7);
        cleanLineP[3].setLRIndexAndLength(3, 0, 8);
        cleanLineP[4].setLRIndexAndLength(4, 0, 9);
        cleanLineP[5].setLRIndexAndLength(5, 1, 8);
        cleanLineP[6].setLRIndexAndLength(6, 2, 7);
        cleanLineP[7].setLRIndexAndLength(7, 3, 6);
        cleanLineP[8].setLRIndexAndLength(8, 4, 5);

        var cleanRowP = new Array(9);
        for(var i = 0; i < cleanRowP.length; ++i){
            cleanRowP[i] = new FullFlagPoint();
            cleanRowP[i].setLRIndexAndLength(cleanLineP[i].m_rowI, cleanLineP[i].m_lineI, cleanLineP[i].m_length);
        }

        var cleanContraryRowP = new Array(9);
        for(var i = 0; i < cleanContraryRowP.length; ++i){
            cleanContraryRowP[i] = new FullFlagPoint();
        }
        cleanContraryRowP[0].setLRIndexAndLength(4, 0, 5);
        cleanContraryRowP[1].setLRIndexAndLength(3, 0, 6);
        cleanContraryRowP[2].setLRIndexAndLength(2, 0, 7);
        cleanContraryRowP[3].setLRIndexAndLength(1, 0, 8);
        cleanContraryRowP[4].setLRIndexAndLength(0, 0, 9);
        cleanContraryRowP[5].setLRIndexAndLength(0, 1, 8);
        cleanContraryRowP[6].setLRIndexAndLength(0, 2, 7);
        cleanContraryRowP[7].setLRIndexAndLength(0, 3, 6);
        cleanContraryRowP[8].setLRIndexAndLength(0, 4, 5);

        var mapV = this.m_mapLayer.m_map.m_mapA;
        //扫描行是否为有满
        for(var i = 0; i < cleanLineP.length; ++i){
            var originalLineI = cleanLineP[i].m_lineI;
            var originalRowI = cleanLineP[i].m_rowI;
            for(var j = 0; j < cleanLineP[i].m_length; ++j){
                if( gMapTag.empty == mapV[originalLineI][originalRowI]){
                    break;
                }
                //每行相同列元素只是列index差一
                else{
                    ++originalRowI;
                }
                //如果这行为满，标记
                if(cleanLineP[i].m_length - 1 == j){
                    cleanLineP[i].m_isFull = true;
                }
            }
        }
        //扫描列是否为有满
        for(var i = 0; i < cleanRowP.length; ++i){
            var originalLineI = cleanRowP[i].m_lineI;
            var originalRowI = cleanRowP[i].m_rowI;
            for(var j = 0; j < cleanRowP[i].m_length; ++j){
                if( gMapTag.empty == mapV[originalLineI][originalRowI]){
                    break;
                }
                //每行相同列元素只是行index差一
                else{
                    ++originalLineI;
                }
                //如果这列为满，标记
                if(cleanRowP[i].m_length - 1 == j){
                    cleanRowP[i].m_isFull = true;
                }
            }
        }
        //扫描反列是否为有满
        for(var i = 0; i < cleanContraryRowP.length; ++i){
            var originalLineI = cleanContraryRowP[i].m_lineI;
            var originalRowI = cleanContraryRowP[i].m_rowI;
            for(var j = 0; j < cleanContraryRowP[i].m_length; ++j){
                if( gMapTag.empty == mapV[originalLineI][originalRowI]){
                    break;
                }
                //每行相同列元素只是行index,列index差一
                else{
                    ++originalLineI;
                    ++originalRowI;
                }
                //如果这列为满，标记
                if(cleanContraryRowP[i].m_length - 1 == j){
                    cleanContraryRowP[i].m_isFull = true;
                }
            }
        }

        var mapBs = this.m_mapLayer.m_blocks;
        //进行消行操作
        for(var i = 0; i < gMapLineM; ++i){
            if(cleanLineP[i].m_isFull){
                var originalLineI = cleanLineP[i].m_lineI;
                var originalRowI = cleanLineP[i].m_rowI;
                for(var j = 0; j < cleanLineP[i].m_length; ++j){
                    mapBs[originalLineI][originalRowI].setSpriteColor(cc.color(255, 255, 255));
                    //消除动作
                    var fadeInA = cc.fadeIn(0.2);
                    //var blinkA = cc.blink(0.5, 2);
                    var mapColor = this.m_mapLayer.m_mapColor;
                    var cleanAction = cc.sequence(fadeInA, cc.delayTime(0.2), new cc.CallFunc(function(){
                        this.setSpriteColor(mapColor);
                    }, mapBs[originalLineI][originalRowI], mapColor));
                    cleanAction.setTag(1);
                    //在执行动作之前先停止其动作，以避免一个对象执行同个动作多次
                    mapBs[originalLineI][originalRowI].stopActionByTag(1);
                    mapBs[originalLineI][originalRowI].runAction(cleanAction);

                    mapV[originalLineI][originalRowI] = gMapTag.empty;
                    ++originalRowI;
                }
                //清除后重新标记
                cleanLineP[i].m_isFull = false;
                //更新消行数
                ++this.m_cleanCount;
                //记录得分
                this.m_cleanScore += 140 + (cleanLineP[i].m_length - 5) * 20;
            }
            if(cleanRowP[i].m_isFull){
                var originalLineI = cleanRowP[i].m_lineI;
                var originalRowI = cleanRowP[i].m_rowI;
                for(var j = 0; j < cleanRowP[i].m_length; ++j){
                    mapBs[originalLineI][originalRowI].setSpriteColor(cc.color(255, 255, 255));
                    //消除动作
                    var fadeInA = cc.fadeIn(0.2);
                    //var blinkA = cc.blink(0.5, 2);
                    var mapColor = this.m_mapLayer.m_mapColor;
                    var cleanAction = cc.sequence(fadeInA, cc.delayTime(0.2), new cc.CallFunc(function(){
                        this.setSpriteColor(mapColor);
                    }, mapBs[originalLineI][originalRowI], mapColor));
                    cleanAction.setTag(1);
                    //在执行动作之前先停止其动作，以避免一个对象执行同个动作多次
                    mapBs[originalLineI][originalRowI].stopActionByTag(1);
                    mapBs[originalLineI][originalRowI].runAction(cleanAction);

                    mapV[originalLineI][originalRowI] = gMapTag.empty;
                    ++originalLineI;
                }
                //清除后重新标记
                cleanRowP[i].m_isFull = false;
                //更新消行数
                ++this.m_cleanCount;
                //记录得分
                this.m_cleanScore += 140 + (cleanLineP[i].m_length - 5) * 20;
            }
            if(cleanContraryRowP[i].m_isFull){
                var originalLineI = cleanContraryRowP[i].m_lineI;
                var originalRowI = cleanContraryRowP[i].m_rowI;
                for(var j = 0; j < cleanContraryRowP[i].m_length; ++j){
                    mapBs[originalLineI][originalRowI].setSpriteColor(cc.color(255, 255, 255));
                    //消除动作
                    var fadeInA = cc.fadeIn(0.2);
                    //var blinkA = cc.blink(0.5, 2);
                    var mapColor = this.m_mapLayer.m_mapColor;
                    var cleanAction = cc.sequence(fadeInA, cc.delayTime(0.2), new cc.CallFunc(function(){
                        this.setSpriteColor(mapColor);
                    }, mapBs[originalLineI][originalRowI], mapColor));
                    cleanAction.setTag(1);
                    //在执行动作之前先停止其动作，以避免一个对象执行同个动作多次
                    mapBs[originalLineI][originalRowI].stopActionByTag(1);
                    mapBs[originalLineI][originalRowI].runAction(cleanAction);

                    mapV[originalLineI][originalRowI] = gMapTag.empty;
                    ++originalLineI;
                    ++originalRowI;
                }
                //清除后重新标记
                cleanContraryRowP[i].m_isFull = false;
                //更新消行数
                ++this.m_cleanCount;
                //记录得分
                this.m_cleanScore += 140 + (cleanLineP[i].m_length - 5) * 20;
            }
        }
    },

    //计算得分
    addScore : function(){
        this.m_score += this.m_putDownScore + this.m_cleanScore;
        //每次得分后的初始化
        this.m_putDownScore = 0;
        this.m_cleanScore = 0;
        cc.log("Score: " + this.m_score);
    },

    gameOver : function(){
        if(this.m_isGameOver){
            var gameLayer = new GameOverLayer();
            this.addChild(gameLayer);
            this.m_isGameOver = false;
        }
    }
});