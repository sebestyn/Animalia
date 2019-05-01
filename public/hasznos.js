//HA MEGNYOMOD AZ ENTERT EGY INPUTON BELÜL
    $.fn.enterPress = function (fnc) {
        return this.each(function () {
            $(this).keypress(function (ev) {
                var keycode = (ev.keyCode ? ev.keyCode : ev.which);
                if (keycode == '13') {
                    fnc.call(this, ev);
                }
            })
        })
    }
    //PL
    /*
        $('input').enterPress(function(){
				$('.aztCsinaljaMinthaEztNyomtaVolna').trigger('click');
		});
	*/
//RANDOM SZÁM KÉT MEGADOTT SZÁM KÖZÖTT
    function randomBetween(min,max){
        return Math.floor(Math.random()*(max-min+1)+min);
    }
    //PL
    /*
        var randomSzam = randomBetween(2,6);
	*/
//RANDOM ID GENERATOR
    function idGenerator(idLength) {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
      for (var i = 0; i < Number(idLength); i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    
      return text;
    }
    //PL
    /*
        var randomId = idGenerator(10);
	*/









