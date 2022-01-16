obj = {
    prop1: 'leo',
    prop2: 22,
    prop3: function () {
        return this
    },
    prop4: function () {
        return this.prop1
    }

}

console.log( obj.prop3() )

console.log( obj.prop4() )
