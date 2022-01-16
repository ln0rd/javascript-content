(function (doc) {

    'use strict'

    // cria o fragmento
    var fragment = doc.createDocumentFragment()

    // create a new tag
    var childP = doc.createElement('p')

    // cria o texto pra ser inserido na tag
    var textChildP = doc.createTextNode('texto da tag P')


    childP.appendChild(textChildP)
    fragment.appendChild(childP)

    doc.body.appendChild(fragment)


})(document)
