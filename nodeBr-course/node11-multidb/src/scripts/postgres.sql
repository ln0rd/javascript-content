DROP TABLE IF EXISTS TB_HEROIS;

CREATE TABLE TB_HEROIS (
    ID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
    NOME TEXT NOT NULL,
    PODER TEXT NOT NULL,
);
--create
INSERT INTO TB_HEROIS (
    NOME, PODER
) VALUES
    ('flash', 'velocidade')
    ('batman','dinheiro')
    ('superman','criptoniano')
    ('aquaman', 'marinho')
    ('Lanterna', 'anel')
    ('supergirl','criptoniano')
    ('arqueiro','arco')
    ('Cyrborg','robo')
--read
SELECT * FROM TB_HEROIS;
SELECT * FROM TB_HEROIS WHERE NOME = 'flash'

--update
UPDATE TB_HEROIS
SET NOME = 'Deku', PODER = 'One for All'
WHERE ID = 1

--delete
DELETE FROM TB_HEROIS WHERE ID = 2
