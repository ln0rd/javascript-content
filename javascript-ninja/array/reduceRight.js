arr2 = ['l', 'e', 'o', 'n', 'a', 'r', 'd', 'o']

var reduce = arr2.reduceRight(function (acumulado, atual, index, array) {
    return acumulado + atual
})

/*

(1) ->  0 + l = l
(2) ->  l + e = le
(3) ->  le + o = leo
(4) ->  leo + n = leon

......

*/

console.log(reduce)
