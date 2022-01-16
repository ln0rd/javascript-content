obj = {

    prop1: {
        prop2: {
            prop3: {
                prop31: '1',
                prop32: '2',
                prop33: '3'
            }
        }
    }
}

console.log( obj.prop1.prop2.prop3 )

//ACESSA DIRETO O OBJ SEM TER QUE CONSULTAR OBJETOS INTERNOS

with( obj.prop1.prop2.prop3 ){

    console.log( prop31, prop32, prop33 )

}
