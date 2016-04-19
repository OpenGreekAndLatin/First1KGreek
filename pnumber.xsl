<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    exclude-result-prefixes="xs"
    version="2.0">
    
    <xsl:template name="teip">
        <xsl:param name="pnumber">0</xsl:param>
        <xsl:copy>
            <xsl:attribute name="n"><xsl:value-of select="$pnumber"></xsl:value-of></xsl:attribute>
            <xsl:apply-templates  select="@*"/>
            <xsl:apply-templates  select="node()|comment()"/>
        </xsl:copy>
    </xsl:template>
    
    <xsl:template match="//tei:div[@subtype='chapter']">
        <xsl:variable name="pnumber">
            <xsl:number value="1" />
        </xsl:variable>
        <xsl:copy>
            <xsl:copy-of select="./@*"></xsl:copy-of>
            <xsl:for-each select="node()|comment()">
                <xsl:choose>
                    <xsl:when test="name()='p'">
                        <xsl:call-template name="teip">
                            <xsl:with-param name="pnumber" select="count(preceding-sibling::tei:p) + 1" />
                        </xsl:call-template>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:copy>
                            <xsl:apply-templates  select="@*"/>
                            <xsl:apply-templates  select="node()|comment()"/>
                        </xsl:copy>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:for-each>
        </xsl:copy>
    </xsl:template>
    
    <xsl:template match="@*">
        <xsl:copy/>
    </xsl:template>
    
    <xsl:template match="node()|comment()">
        <xsl:copy>
            <xsl:apply-templates select="./@*"/>
            <xsl:apply-templates  select="node()|comment()"/>
        </xsl:copy>
    </xsl:template>
</xsl:stylesheet>