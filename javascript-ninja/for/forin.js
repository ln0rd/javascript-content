var obj = {

    name: 'leo',
    old: 22,
    burn_date: '03/05/1996',
    size: 'tall',
    live_in: 'Porto Feliz'

}

for ( var prop in obj ) {

    console.log( prop )
    console.log( obj[prop] )
    console.log( obj.prop )
    console.log( obj.name )

}

console.log( Object.keys(obj).forEach(prop => console.log(obj[prop])) )

console.log( 'name' in obj )
