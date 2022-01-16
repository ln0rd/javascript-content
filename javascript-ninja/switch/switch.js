 function swi(x){

    switch (x) {
        case 1:
            return 'é 1'
            break;

        case 10:
            return 'é 10'
            break;

        case 2:
            return 'é 2'
            break;

        case 5:
            return 'é 5'
            break;

        default:
            return 'n é nenhum'
            break;
    }

}

console.log( swi(2) )
console.log( swi(0) )
console.log( swi(10) )
console.log( swi(7) )
