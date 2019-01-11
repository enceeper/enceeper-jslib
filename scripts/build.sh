SRC="src/enceeper.base.js src/enceeper.exceptions.js src/enceeper.network.js src/enceeper.srp6a.js src/enceeper.crypto.js src/enceeper.api.js src/enceeper.app.js"
DST="dist/enceeper.js"

rm -rf $DST && cat $SRC > $DST
